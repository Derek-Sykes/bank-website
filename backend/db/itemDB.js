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

export async function postItem(item) {
  let {
    name,
    description = null,
    cost = null,
    balance = null,
    category_id = null,
    user_id = null,
  } = item;
  console.log(
    "ITEM spelled out: ",
    name,
    description,
    cost,
    balance,
    category_id,
    user_id,
  );
  try {
    await pool.query(
      `
            INSERT INTO item (name, description, cost, balance, category_id, user_id)
            VALUES (?, ?, ?, ?, ?, ?)
            `,
      [name, description, cost, balance, category_id, user_id],
    );
    return 1;
  } catch (error) {
    let errno = error.errno;
    switch (errno) {
      case 1048:
        console.log("Name must have a value");
        return "Name must have a value";
      // space for more possible error codes from sql
      default:
        console.log("Error creating item: ", error);
        break;
    }
    console.log(error);
    return error;
  }
}

export async function getItemBy(user_id, type, value) {
  value = !value ? null : value;
  console.log("inputs: ", user_id, type, value);

  const allowedColumns = [
    "item_id",
    "name",
    "description",
    "cost",
    "balance",
    "category_id",
    "user_id",
    "status",
    "allocatedAmount",
    "allocationPercent",
  ];
  if (type && !allowedColumns.includes(type)) {
    throw new Error(`Invalid column name provided. type: ${type} not allowed`);
  }
  const query = `SELECT * FROM item WHERE ${type} = ? AND user_id = ?`;
  const nullValueQuery = `SELECT * FROM item WHERE ${type} iS NULL AND user_id = ?`;
  const nullUserQuery = `SELECT * FROM item WHERE ${type} = ?`;
  const nullTypeQuery = `SELECT * FROM item WHERE user_id = ?`;
  const nullQuery = `SELECT * FROM item`;
  try {
    if (!type && !user_id) {
      let items = (await pool.query(nullQuery))[0];
      console.log("items: ", items);
      return items;
    } else if (!user_id) {
      let items = (await pool.query(nullUserQuery, [value]))[0];
      console.log("items: ", items);
      return items;
    } else if (type && !value) {
      let items = (await pool.query(nullValueQuery, [user_id]))[0];
      console.log("items: ", items);
      return items;
    } else if (!type) {
      let items = (await pool.query(nullTypeQuery, [user_id]))[0];
      console.log("items: ", items);
      return items;
    }
    let items = (await pool.query(query, [value, user_id]))[0];
    console.log("items: ", items);
    return items;
  } catch (error) {
    let errno = error.errno;
    switch (errno) {
      // placeholder
      case 1048:
        console.log("error of 1048 means: ", error);
        return null;
      // space for more possible error codes from sql
      default:
        console.log("Error getting item: ", error);
        return null;
    }
  }
}

export async function updateItem(
  item_id,
  name,
  description,
  cost,
  balance,
  category_id,
  user_id,
) {
  const query = `UPDATE item SET name = ?, description = ?, cost = ?, balance = ?, category_id =? WHERE item_id = ? && user_id = ?`;

  try {
    await pool.query(query, [
      name,
      description,
      cost,
      balance,
      category_id,
      item_id,
      user_id,
    ]);
    return null;
  } catch (error) {
    console.log(error);
    return error;
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
  // Using parameter placeholders for all values makes the query secure against SQL injection.
  const query = `
    UPDATE bank_app.item
    SET balance = CASE
      WHEN item_id = ? THEN balance - ?
      WHEN item_id = ? THEN balance + ?
      ELSE balance
    END
    WHERE item_id IN (?, ?) AND user_id = ?;
  `;

  try {
    // Order of parameters:
    // 1. item_id1 (for subtracting money)
    // 2. amount (the transfer amount to subtract)
    // 3. item_id2 (for adding money)
    // 4. amount (the same transfer amount to add)
    // 5. item_id1 (first account in the WHERE clause)
    // 6. item_id2 (second account in the WHERE clause)
    // 7. user_id (ensuring both accounts belong to this user)
    await pool.query(query, [
      item_id1,
      amount,
      item_id2,
      amount,
      item_id1,
      item_id2,
      user_id,
    ]);
    return null;
  } catch (error) {
    console.log(error);
    return error;
  }
}

const toNumber = (value) => Number(value || 0);
const roundCurrency = (value) => Math.round(toNumber(value) * 100) / 100;
const roundPercent = (value) => Math.round(toNumber(value) * 10000) / 10000;

async function createActivityLog(
  connection,
  userId,
  categoryId,
  itemId,
  type,
  message,
  metadata = {},
) {
  await connection.query(
    `
      INSERT INTO activity_log (user_id, category_id, item_id, type, message, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [userId, categoryId, itemId, type, message, JSON.stringify(metadata)],
  );
}

async function renormalizeActiveItems(connection, userId, categoryId) {
  const [activeItems] = await connection.query(
    `
      SELECT item_id, allocationPercent
      FROM item
      WHERE user_id = ?
        AND category_id = ?
        AND COALESCE(status, 'ACTIVE') NOT IN ('PURCHASED', 'CANCELLED')
      ORDER BY item_id
      FOR UPDATE
    `,
    [userId, categoryId],
  );

  if (!activeItems.length) {
    return [];
  }

  const currentTotal = activeItems.reduce(
    (total, item) => total + toNumber(item.allocationPercent),
    0,
  );

  let normalizedItems;
  if (currentTotal > 0) {
    normalizedItems = activeItems.map((item) => ({
      item_id: item.item_id,
      allocationPercent: roundPercent(
        (toNumber(item.allocationPercent) / currentTotal) * 100,
      ),
    }));
  } else {
    const evenPercent = roundPercent(100 / activeItems.length);
    normalizedItems = activeItems.map((item) => ({
      item_id: item.item_id,
      allocationPercent: evenPercent,
    }));
  }

  const normalizedTotal = normalizedItems.reduce(
    (total, item) => total + item.allocationPercent,
    0,
  );
  normalizedItems[normalizedItems.length - 1].allocationPercent = roundPercent(
    normalizedItems[normalizedItems.length - 1].allocationPercent +
      (100 - normalizedTotal),
  );

  await Promise.all(
    normalizedItems.map((item) =>
      connection.query(
        `UPDATE item SET allocationPercent = ? WHERE item_id = ? AND user_id = ?`,
        [item.allocationPercent, item.item_id, userId],
      ),
    ),
  );

  return normalizedItems;
}

export async function cancelItem(item_id, user_id) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[cashBefore]] = await connection.query(
      `SELECT COALESCE(
          SUM(
            CASE
              WHEN category_id IS NULL THEN COALESCE(balance, 0)
              WHEN COALESCE(allocatedAmount, 0) > 0 THEN allocatedAmount
              ELSE COALESCE(balance, 0)
            END
          ),
          0
        ) AS totalCash
        FROM item
        WHERE user_id = ?`,
      [user_id],
    );

    const [items] = await connection.query(
      `SELECT * FROM item WHERE item_id = ? AND user_id = ? FOR UPDATE`,
      [item_id, user_id],
    );

    if (!items.length) {
      const error = new Error("Item not found");
      error.statusCode = 404;
      throw error;
    }

    const item = items[0];
    const status = item.status || "ACTIVE";
    if (["PURCHASED", "CANCELLED"].includes(status)) {
      const error = new Error(`Cannot cancel an item with status ${status}`);
      error.statusCode = 409;
      throw error;
    }

    if (item.category_id === null || item.category_id === undefined) {
      const error = new Error("Main Account cannot be cancelled");
      error.statusCode = 400;
      throw error;
    }

    const [mainAccounts] = await connection.query(
      `
        SELECT *
        FROM item
        WHERE user_id = ? AND category_id IS NULL AND name = 'Main Account'
        ORDER BY item_id
        LIMIT 1
        FOR UPDATE
      `,
      [user_id],
    );

    if (!mainAccounts.length) {
      const error = new Error("Main Account not found");
      error.statusCode = 400;
      throw error;
    }

    const mainAccount = mainAccounts[0];
    const allocatedAmount = roundCurrency(
      toNumber(item.allocatedAmount) > 0 ? item.allocatedAmount : item.balance,
    );

    await connection.query(
      `UPDATE item SET balance = balance + ? WHERE item_id = ? AND user_id = ?`,
      [allocatedAmount, mainAccount.item_id, user_id],
    );

    await connection.query(
      `
        UPDATE category
        SET heldBalance = GREATEST(0, COALESCE(heldBalance, 0) - ?),
            unallocatedAmount = LEAST(
              GREATEST(0, COALESCE(unallocatedAmount, 0)),
              GREATEST(0, COALESCE(heldBalance, 0) - ?)
            )
        WHERE category_id = ? AND user_id = ?
      `,
      [allocatedAmount, allocatedAmount, item.category_id, user_id],
    );

    await connection.query(
      `
        UPDATE item
        SET status = 'CANCELLED',
            allocatedAmount = 0,
            allocationPercent = 0,
            balance = 0
        WHERE item_id = ? AND user_id = ?
      `,
      [item_id, user_id],
    );

    const normalizedItems = await renormalizeActiveItems(
      connection,
      user_id,
      item.category_id,
    );

    await createActivityLog(
      connection,
      user_id,
      item.category_id,
      item_id,
      "ITEM_CANCELLED",
      `${item.name} was cancelled and ${allocatedAmount.toFixed(2)} was returned to Main Account.`,
      {
        itemName: item.name,
        returnedAmount: allocatedAmount,
        mainAccountId: mainAccount.item_id,
      },
    );

    await createActivityLog(
      connection,
      user_id,
      item.category_id,
      item_id,
      "ALLOCATION_CHANGED",
      `Allocations were rebalanced after cancelling ${item.name}.`,
      {
        cancelledItemId: item_id,
        normalizedItems,
      },
    );

    const [[cashAfter]] = await connection.query(
      `SELECT COALESCE(
          SUM(
            CASE
              WHEN category_id IS NULL THEN COALESCE(balance, 0)
              WHEN COALESCE(allocatedAmount, 0) > 0 THEN allocatedAmount
              ELSE COALESCE(balance, 0)
            END
          ),
          0
        ) AS totalCash
        FROM item
        WHERE user_id = ?`,
      [user_id],
    );

    if (
      Math.abs(toNumber(cashBefore.totalCash) - toNumber(cashAfter.totalCash)) >
      0.01
    ) {
      const error = new Error(
        "Total simulated cash changed during cancellation",
      );
      error.statusCode = 500;
      throw error;
    }

    await connection.commit();

    return {
      item: {
        ...item,
        status: "CANCELLED",
        balance: 0,
        allocatedAmount: 0,
        allocationPercent: 0,
      },
      returnedAmount: allocatedAmount,
      normalizedItems,
      totalCash: roundCurrency(cashAfter.totalCash),
    };
  } catch (error) {
    await connection.rollback();
    console.log("Error cancelling item: ", error);
    return error;
  } finally {
    connection.release();
  }
}

export async function getActivityLogsByCategory(user_id, category_id) {
  try {
    const [activityLogs] = await pool.query(
      `
        SELECT activity_log_id, user_id, category_id, item_id, type, message, metadata, created_at
        FROM activity_log
        WHERE user_id = ? AND category_id = ?
        ORDER BY created_at DESC, activity_log_id DESC
      `,
      [user_id, category_id],
    );
    return activityLogs;
  } catch (error) {
    console.log("Error getting activity logs: ", error);
    return null;
  }
}
