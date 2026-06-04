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

const FINAL_STATUSES = ["PURCHASED", "CANCELLED"];

const roundCurrency = (amount) => Math.round(Number(amount) * 100) / 100;

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
    "allocation_percent",
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

async function renormalizeActiveItemAllocations(
  connection,
  categoryId,
  userId,
) {
  const [activeItems] = await connection.query(
    `SELECT item_id, COALESCE(allocation_percent, 0) AS allocation_percent
     FROM item
     WHERE category_id = ?
       AND user_id = ?
       AND (status IS NULL OR status NOT IN (?, ?))
     ORDER BY item_id
     FOR UPDATE`,
    [categoryId, userId, ...FINAL_STATUSES],
  );

  if (activeItems.length === 0) {
    return [];
  }

  const totalPercent = activeItems.reduce(
    (total, item) => total + Number(item.allocation_percent || 0),
    0,
  );

  const normalizedItems = [];
  let assignedPercent = 0;

  for (let index = 0; index < activeItems.length; index += 1) {
    const item = activeItems[index];
    let nextPercent;

    if (index === activeItems.length - 1) {
      nextPercent = roundCurrency(100 - assignedPercent);
    } else if (totalPercent > 0) {
      nextPercent = roundCurrency(
        (Number(item.allocation_percent || 0) / totalPercent) * 100,
      );
      assignedPercent = roundCurrency(assignedPercent + nextPercent);
    } else {
      nextPercent = roundCurrency(100 / activeItems.length);
      assignedPercent = roundCurrency(assignedPercent + nextPercent);
    }

    normalizedItems.push({
      item_id: item.item_id,
      allocation_percent: nextPercent,
    });
  }

  for (const item of normalizedItems) {
    await connection.query(
      `UPDATE item SET allocation_percent = ? WHERE item_id = ? AND user_id = ?`,
      [item.allocation_percent, item.item_id, userId],
    );
  }

  return normalizedItems;
}

export async function purchaseItem(itemId, userId, purchase) {
  const purchaseAmount = roundCurrency(purchase.purchaseAmount);
  const purchaseDate = purchase.purchaseDate;
  const note = purchase.note || null;

  if (!Number.isFinite(purchaseAmount) || purchaseAmount <= 0) {
    return { error: "Purchase amount must be greater than 0.", status: 400 };
  }

  if (!purchaseDate || Number.isNaN(Date.parse(purchaseDate))) {
    return {
      error: "Purchase date is required and must be valid.",
      status: 400,
    };
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[item]] = await connection.query(
      `SELECT * FROM item WHERE item_id = ? AND user_id = ? FOR UPDATE`,
      [itemId, userId],
    );

    if (!item) {
      await connection.rollback();
      return { error: "Item not found.", status: 404 };
    }

    if (!item.category_id) {
      await connection.rollback();
      return {
        error: "Main Account cannot be marked as purchased.",
        status: 400,
      };
    }

    if (FINAL_STATUSES.includes(item.status)) {
      await connection.rollback();
      return {
        error: `Item is already ${item.status.toLowerCase()}.`,
        status: 400,
      };
    }

    const [[category]] = await connection.query(
      `SELECT * FROM category WHERE category_id = ? AND user_id = ? FOR UPDATE`,
      [item.category_id, userId],
    );

    if (!category) {
      await connection.rollback();
      return { error: "Category not found for this item.", status: 404 };
    }

    const [[mainAccount]] = await connection.query(
      `SELECT *
       FROM item
       WHERE user_id = ? AND category_id IS NULL
       ORDER BY item_id
       LIMIT 1
       FOR UPDATE`,
      [userId],
    );

    if (!mainAccount) {
      await connection.rollback();
      return { error: "Main Account not found.", status: 404 };
    }

    const allocatedAmount = roundCurrency(item.balance || 0);
    const mainBalance = roundCurrency(mainAccount.balance || 0);
    const extraAmount = roundCurrency(
      Math.max(purchaseAmount - allocatedAmount, 0),
    );
    const leftoverAmount = roundCurrency(
      Math.max(allocatedAmount - purchaseAmount, 0),
    );

    if (extraAmount > mainBalance) {
      await connection.rollback();
      return {
        error: `Main Account cannot cover the $${extraAmount.toFixed(2)} difference.`,
        status: 400,
      };
    }

    const newMainBalance = roundCurrency(
      mainBalance + leftoverAmount - extraAmount,
    );

    await connection.query(
      `UPDATE item
       SET balance = 0,
           status = ?,
           allocation_percent = 0,
           purchased_at = ?,
           purchase_amount = ?,
           purchase_note = ?
       WHERE item_id = ? AND user_id = ?`,
      ["PURCHASED", purchaseDate, purchaseAmount, note, itemId, userId],
    );

    await connection.query(
      `UPDATE item SET balance = ? WHERE item_id = ? AND user_id = ?`,
      [newMainBalance, mainAccount.item_id, userId],
    );

    const normalizedItems = await renormalizeActiveItemAllocations(
      connection,
      item.category_id,
      userId,
    );

    await connection.query(
      `INSERT INTO activity_log (user_id, item_id, category_id, type, note, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        itemId,
        item.category_id,
        "ITEM_PURCHASED",
        note,
        JSON.stringify({
          itemName: item.name,
          purchaseAmount,
          purchaseDate,
          allocatedAmount,
          extraAmount,
          leftoverAmount,
        }),
      ],
    );

    await connection.query(
      `INSERT INTO activity_log (user_id, item_id, category_id, type, note, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        itemId,
        item.category_id,
        "ALLOCATION_CHANGED",
        `Renormalized active item allocations after purchasing ${item.name}.`,
        JSON.stringify({
          purchasedItemId: itemId,
          purchasedItemAllocationPercent: 0,
          activeAllocations: normalizedItems,
        }),
      ],
    );

    const notificationMessage = `You marked ${item.name} as purchased for $${purchaseAmount.toFixed(2)}.`;
    await connection.query(
      `INSERT INTO notification (user_id, item_id, category_id, message)
       VALUES (?, ?, ?, ?)`,
      [userId, itemId, item.category_id, notificationMessage],
    );

    await connection.commit();

    return {
      data: {
        item_id: itemId,
        status: "PURCHASED",
        balance: 0,
        allocation_percent: 0,
        purchase_amount: purchaseAmount,
        purchased_at: purchaseDate,
        purchase_note: note,
        main_account_balance: newMainBalance,
        active_allocations: normalizedItems,
        notification: notificationMessage,
      },
    };
  } catch (error) {
    await connection.rollback();
    console.log("Error purchasing item: ", error);
    return { error: "Error purchasing item, see console.", status: 500 };
  } finally {
    connection.release();
  }
}
