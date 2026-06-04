import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql
  .createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  })
  .promise();

const ITEM_STATUSES = {
  ACTIVE: "ACTIVE",
  FULLY_FUNDED: "FULLY_FUNDED",
  PURCHASED: "PURCHASED",
  CANCELLED: "CANCELLED",
};

const ALLOCATION_TOTAL_STATUSES = [ITEM_STATUSES.ACTIVE];
const COMPLETED_STATUSES = [ITEM_STATUSES.PURCHASED, ITEM_STATUSES.CANCELLED];

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeItemInput(item) {
  return {
    ...item,
    targetAmount: item.targetAmount ?? null,
    allocatedAmount: item.allocatedAmount ?? 0,
    allocationPercent: item.allocationPercent ?? 0,
    status: item.status ?? ITEM_STATUSES.ACTIVE,
  };
}

function normalizeStatus(status) {
  const normalizedStatus = String(status || ITEM_STATUSES.ACTIVE).toUpperCase();
  return ITEM_STATUSES[normalizedStatus] || ITEM_STATUSES.ACTIVE;
}

function applyFundingRules(item, previousItem = null) {
  const normalizedItem = {
    ...item,
    targetAmount: toNumber(item.targetAmount, 0),
    allocatedAmount: toNumber(item.allocatedAmount, 0),
    allocationPercent: toNumber(item.allocationPercent, 0),
    status: normalizeStatus(item.status),
  };

  const wasFullyFunded = previousItem?.status === ITEM_STATUSES.FULLY_FUNDED;
  const meetsFundingTarget =
    normalizedItem.targetAmount > 0 &&
    normalizedItem.allocatedAmount >= normalizedItem.targetAmount;

  if (meetsFundingTarget) {
    normalizedItem.status = ITEM_STATUSES.FULLY_FUNDED;
  }

  if (normalizedItem.status === ITEM_STATUSES.FULLY_FUNDED) {
    normalizedItem.allocationPercent = 0;
  }

  return {
    item: normalizedItem,
    reachedFullyFunded:
      normalizedItem.status === ITEM_STATUSES.FULLY_FUNDED && !wasFullyFunded,
  };
}

async function getItemForUser(connection, item_id, user_id) {
  const rows = (
    await connection.query(
      `SELECT * FROM item WHERE item_id = ? AND user_id = ?`,
      [item_id, user_id],
    )
  )[0];
  return rows[0] ?? null;
}

async function getCategoryItems(
  connection,
  category_id,
  user_id,
  excludedItemId = null,
) {
  const params = [category_id, user_id];
  let excludedClause = "";
  if (excludedItemId) {
    excludedClause = " AND item_id <> ?";
    params.push(excludedItemId);
  }

  return (
    await connection.query(
      `SELECT * FROM item WHERE category_id = ? AND user_id = ?${excludedClause}`,
      params,
    )
  )[0];
}

async function validateCategoryAllocation(connection, candidateItem) {
  if (!candidateItem.category_id) return null;

  const categoryItems = await getCategoryItems(
    connection,
    candidateItem.category_id,
    candidateItem.user_id,
    candidateItem.item_id,
  );
  const itemsForTotal = [...categoryItems, candidateItem];
  const activeItems = itemsForTotal.filter((item) =>
    ALLOCATION_TOTAL_STATUSES.includes(normalizeStatus(item.status)),
  );

  if (activeItems.length === 0) return null;

  const allocationTotal = activeItems.reduce(
    (total, item) => total + toNumber(item.allocationPercent, 0),
    0,
  );

  if (Math.abs(allocationTotal - 100) > 0.0001) {
    return `Active item allocation percentages in a category must total 100%. Current total would be ${allocationTotal}%.`;
  }

  return null;
}

async function logFullyFunded(connection, item) {
  await connection.query(
    `INSERT INTO ActivityLog (user_id, item_id, category_id, type, message)
     VALUES (?, ?, ?, ?, ?)`,
    [
      item.user_id,
      item.item_id,
      item.category_id,
      "FULLY_FUNDED_REACHED",
      `Item ${item.name} reached fully funded status.`,
    ],
  );

  await connection.query(
    `INSERT INTO Notification (user_id, item_id, category_id, message)
     VALUES (?, ?, ?, ?)`,
    [
      item.user_id,
      item.item_id,
      item.category_id,
      `Item ${item.name} is fully funded – consider redistributing this category.`,
    ],
  );
}

export async function postItem(item) {
  const normalizedInput = normalizeItemInput(item);
  let {
    name,
    description = null,
    targetAmount = null,
    allocatedAmount = 0,
    allocationPercent = 0,
    status = ITEM_STATUSES.ACTIVE,
    category_id = null,
    user_id = null,
  } = normalizedInput;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const fundingResult = applyFundingRules({
      name,
      description,
      targetAmount,
      allocatedAmount,
      allocationPercent,
      status,
      category_id,
      user_id,
    });
    const candidateItem = fundingResult.item;

    if (candidateItem.status === ITEM_STATUSES.ACTIVE) {
      const allocationError = await validateCategoryAllocation(
        connection,
        candidateItem,
      );
      if (allocationError) {
        await connection.rollback();
        return allocationError;
      }
    }

    const result = (
      await connection.query(
        `INSERT INTO item
          (name, description, targetAmount, allocatedAmount, allocationPercent, status, category_id, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          candidateItem.name,
          candidateItem.description,
          candidateItem.targetAmount,
          candidateItem.allocatedAmount,
          candidateItem.allocationPercent,
          candidateItem.status,
          candidateItem.category_id,
          candidateItem.user_id,
        ],
      )
    )[0];

    candidateItem.item_id = result.insertId;
    if (fundingResult.reachedFullyFunded) {
      await logFullyFunded(connection, candidateItem);
    }

    await connection.commit();
    return 1;
  } catch (error) {
    await connection.rollback();
    const errno = error.errno;
    switch (errno) {
      case 1048:
        console.log("Name must have a value");
        return "Name must have a value";
      default:
        console.log("Error creating item: ", error);
        break;
    }
    return error;
  } finally {
    connection.release();
  }
}

export async function getItemBy(user_id, type, value) {
  value = !value ? null : value;

  const allowedColumns = [
    "item_id",
    "name",
    "description",
    "targetAmount",
    "allocatedAmount",
    "allocationPercent",
    "status",
    "category_id",
    "user_id",
  ];
  if (type && !allowedColumns.includes(type)) {
    throw new Error(`Invalid column name provided. type: ${type} not allowed`);
  }
  const query = `SELECT * FROM item WHERE ${type} = ? AND user_id = ?`;
  const nullValueQuery = `SELECT * FROM item WHERE ${type} IS NULL AND user_id = ?`;
  const nullUserQuery = `SELECT * FROM item WHERE ${type} = ?`;
  const nullTypeQuery = `SELECT * FROM item WHERE user_id = ?`;
  const nullQuery = `SELECT * FROM item`;
  try {
    if (!type && !user_id) {
      return (await pool.query(nullQuery))[0];
    } else if (!user_id) {
      return (await pool.query(nullUserQuery, [value]))[0];
    } else if (type && !value) {
      return (await pool.query(nullValueQuery, [user_id]))[0];
    } else if (!type) {
      return (await pool.query(nullTypeQuery, [user_id]))[0];
    }
    return (await pool.query(query, [value, user_id]))[0];
  } catch (error) {
    console.log("Error getting item: ", error);
    return null;
  }
}

export async function updateItem(item_id, updateData, user_id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const currentItem = await getItemForUser(connection, item_id, user_id);
    if (!currentItem) {
      await connection.rollback();
      return "Item not found";
    }

    const candidateItem = {
      ...currentItem,
      item_id,
      user_id,
      name: updateData.name ?? currentItem.name,
      description: updateData.description ?? currentItem.description,
      targetAmount: updateData.targetAmount ?? currentItem.targetAmount,
      allocatedAmount:
        updateData.allocatedAmount ?? currentItem.allocatedAmount,
      allocationPercent:
        updateData.allocationPercent ?? currentItem.allocationPercent,
      status: updateData.status ?? currentItem.status,
      category_id: updateData.category_id ?? currentItem.category_id,
    };

    const fundingResult = applyFundingRules(candidateItem, currentItem);
    if (fundingResult.item.status === ITEM_STATUSES.ACTIVE) {
      const allocationError = await validateCategoryAllocation(
        connection,
        fundingResult.item,
      );
      if (allocationError) {
        await connection.rollback();
        return allocationError;
      }
    }

    await connection.query(
      `UPDATE item
       SET name = ?, description = ?, targetAmount = ?, allocatedAmount = ?,
           allocationPercent = ?, status = ?, category_id = ?
       WHERE item_id = ? AND user_id = ?`,
      [
        fundingResult.item.name,
        fundingResult.item.description,
        fundingResult.item.targetAmount,
        fundingResult.item.allocatedAmount,
        fundingResult.item.allocationPercent,
        fundingResult.item.status,
        fundingResult.item.category_id,
        item_id,
        user_id,
      ],
    );

    if (fundingResult.reachedFullyFunded) {
      await logFullyFunded(connection, fundingResult.item);
    }

    await connection.commit();
    return null;
  } catch (error) {
    await connection.rollback();
    console.log(error);
    return error;
  } finally {
    connection.release();
  }
}

export async function deleteItem(item_id, user_id) {
  const query = `DELETE FROM item WHERE item_id = ? && user_id = ?`;
  try {
    await pool.query(query, [item_id, user_id]);
    return null;
  } catch (error) {
    console.log(error);
    return error;
  }
}

export async function transfer(item_id1, item_id2, amount, user_id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const fromItem = await getItemForUser(connection, item_id1, user_id);
    const toItem = await getItemForUser(connection, item_id2, user_id);
    if (!fromItem || !toItem) {
      await connection.rollback();
      return "Both transfer items must exist";
    }

    await connection.query(
      `UPDATE item
       SET allocatedAmount = CASE
         WHEN item_id = ? THEN allocatedAmount - ?
         WHEN item_id = ? THEN allocatedAmount + ?
         ELSE allocatedAmount
       END
       WHERE item_id IN (?, ?) AND user_id = ?`,
      [item_id1, amount, item_id2, amount, item_id1, item_id2, user_id],
    );

    const updatedToItem = await getItemForUser(connection, item_id2, user_id);
    const fundingResult = applyFundingRules(updatedToItem, toItem);

    if (fundingResult.item.status !== updatedToItem.status) {
      if (fundingResult.item.status === ITEM_STATUSES.ACTIVE) {
        const allocationError = await validateCategoryAllocation(
          connection,
          fundingResult.item,
        );
        if (allocationError) {
          await connection.rollback();
          return allocationError;
        }
      }

      await connection.query(
        `UPDATE item SET allocationPercent = ?, status = ? WHERE item_id = ? AND user_id = ?`,
        [
          fundingResult.item.allocationPercent,
          fundingResult.item.status,
          item_id2,
          user_id,
        ],
      );
    }

    if (fundingResult.reachedFullyFunded) {
      await logFullyFunded(connection, fundingResult.item);
    }

    await connection.commit();
    return null;
  } catch (error) {
    await connection.rollback();
    console.log(error);
    return error;
  } finally {
    connection.release();
  }
}

export { ITEM_STATUSES, COMPLETED_STATUSES };
