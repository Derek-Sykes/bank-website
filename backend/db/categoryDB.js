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

export async function postCategory(category) {
  let { name, description = null, user_id = null } = category;
  console.log("CATEGORY spelled out: ", name, description, user_id);
  try {
    await pool.query(
      `
            INSERT INTO category (name, description, user_id)
            VALUES (?, ?, ?)
            `,
      [name, description, user_id],
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
        console.log("Error creating category: ", error);
        break;
    }
    console.log(error);
    return error;
  }
}

export async function getCategorys(user_id) {
  console.log("user_id: ", user_id);

  const query = `SELECT * FROM category WHERE user_id = ?`;

  try {
    let categorys = (await pool.query(query, [user_id]))[0];
    console.log("categorys: ", categorys);
    return categorys;
  } catch (error) {
    let errno = error.errno;
    switch (errno) {
      // placeholder
      case 1048:
        console.log("ERROR: ", error);
        return null;
      // space for more possible error codes from sql
      default:
        console.log("Error getting category: ", error);
        return null;
    }
  }
}

export async function updateCategory(category_id, name, description, user_id) {
  const query = `UPDATE category SET name = ?, description = ? WHERE category_id = ? && user_id = ?`;

  try {
    await pool.query(query, [name, description, category_id, user_id]);
    return null;
  } catch (error) {
    console.log(error);
    return error;
  }
}
export async function deleteCategory(category_id, user_id) {
  const query = `DELETE FROM category WHERE category_id = ? && user_id = ?`;
  try {
    await pool.query(query, [category_id, user_id]);
    return null;
  } catch (error) {
    console.log(error);
    return error;
  }
}

const MONEY_EPSILON = 0.000001;

function asMoney(value, fieldName) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }
  return Math.round(numberValue * 100) / 100;
}

function normalizeAllocationEntries(body) {
  const explicit = body.allocations ?? body.amounts ?? body.itemAmounts;
  const percentages = body.percentages ?? body.itemPercentages;

  if ((explicit && percentages) || (!explicit && !percentages)) {
    throw new Error(
      "Provide either explicit item amounts or percentages, but not both",
    );
  }

  const mode = explicit ? "amount" : "percentage";
  const rawEntries = explicit ?? percentages;
  const entries = Array.isArray(rawEntries)
    ? rawEntries
    : Object.entries(rawEntries).map(([item_id, value]) => ({
        item_id,
        [mode === "amount" ? "amount" : "percentage"]: value,
      }));

  if (!entries.length) {
    throw new Error("At least one allocation entry is required");
  }

  return {
    mode,
    entries: entries.map((entry) => ({
      item_id: Number(entry.item_id),
      value: asMoney(
        mode === "amount" ? entry.amount : entry.percentage,
        mode === "amount" ? "amount" : "percentage",
      ),
    })),
  };
}

export async function allocateUnallocatedFunds(category_id, user_id, body) {
  const allowTargetIncrease = body.allowTargetIncrease === true;
  const { mode, entries } = normalizeAllocationEntries(body);
  const itemIds = entries.map((entry) => entry.item_id);
  const uniqueItemIds = [...new Set(itemIds)];

  if (uniqueItemIds.some((itemId) => !Number.isInteger(itemId))) {
    throw new Error("Every allocation entry must include a valid item_id");
  }
  if (uniqueItemIds.length !== itemIds.length) {
    throw new Error("Duplicate item allocations are not allowed");
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [categories] = await connection.query(
      `SELECT * FROM category WHERE category_id = ? AND user_id = ? FOR UPDATE`,
      [category_id, user_id],
    );

    if (!categories.length) {
      throw new Error("Category not found for this user");
    }

    const category = categories[0];
    const unallocatedBalance = asMoney(
      category.unallocated_balance ?? 0,
      "unallocated_balance",
    );

    const placeholders = uniqueItemIds.map(() => "?").join(", ");
    const [items] = await connection.query(
      `SELECT * FROM item
       WHERE item_id IN (${placeholders})
         AND category_id = ?
         AND user_id = ?
       FOR UPDATE`,
      [...uniqueItemIds, category_id, user_id],
    );

    if (items.length !== uniqueItemIds.length) {
      throw new Error("All target items must belong to this category and user");
    }

    const itemsById = new Map(
      items.map((item) => [Number(item.item_id), item]),
    );
    let allocations = entries.map((entry) => ({ ...entry }));

    for (const allocation of allocations) {
      const item = itemsById.get(allocation.item_id);
      const balance = asMoney(item.balance ?? 0, "balance");
      const cost = asMoney(item.cost ?? 0, "cost");
      if (balance >= cost - MONEY_EPSILON) {
        throw new Error("Target items must be active and not fully funded");
      }
    }

    if (mode === "percentage") {
      const totalPercentage = allocations.reduce(
        (sum, entry) => sum + entry.value,
        0,
      );
      if (totalPercentage > 100 + MONEY_EPSILON) {
        throw new Error("Total allocation percentage cannot exceed 100");
      }
      allocations = allocations.map((entry) => ({
        item_id: entry.item_id,
        value: Math.round(unallocatedBalance * entry.value) / 100,
      }));
    }

    const totalAllocated = asMoney(
      allocations.reduce((sum, entry) => sum + entry.value, 0),
      "total allocated amount",
    );

    if (totalAllocated <= MONEY_EPSILON) {
      throw new Error("Total allocated amount must be greater than 0");
    }
    if (totalAllocated > unallocatedBalance + MONEY_EPSILON) {
      throw new Error(
        "Total allocated amount cannot exceed the category unallocated balance",
      );
    }

    const fullyFundedItems = [];
    for (const allocation of allocations) {
      const item = itemsById.get(allocation.item_id);
      const balance = asMoney(item.balance ?? 0, "balance");
      const cost = asMoney(item.cost ?? 0, "cost");
      const newBalance = asMoney(balance + allocation.value, "new balance");

      if (!allowTargetIncrease && newBalance > cost + MONEY_EPSILON) {
        throw new Error(
          `Allocation would fund item ${allocation.item_id} beyond its target`,
        );
      }

      if (allowTargetIncrease && newBalance > cost + MONEY_EPSILON) {
        await connection.query(`UPDATE item SET cost = ? WHERE item_id = ?`, [
          newBalance,
          allocation.item_id,
        ]);
      }

      await connection.query(`UPDATE item SET balance = ? WHERE item_id = ?`, [
        newBalance,
        allocation.item_id,
      ]);

      await connection.query(
        `INSERT INTO allocation_log
          (category_id, item_id, user_id, amount, allocation_type, message)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          category_id,
          allocation.item_id,
          user_id,
          allocation.value,
          mode,
          `Allocated $${allocation.value.toFixed(2)} from category unallocated funds`,
        ],
      );

      if (
        newBalance >=
        (allowTargetIncrease ? newBalance : cost) - MONEY_EPSILON
      ) {
        fullyFundedItems.push({
          item_id: allocation.item_id,
          name: item.name,
          balance: newBalance,
          cost: allowTargetIncrease ? newBalance : cost,
        });
      }
    }

    const newUnallocatedBalance = asMoney(
      unallocatedBalance - totalAllocated,
      "new unallocated balance",
    );
    await connection.query(
      `UPDATE category SET unallocated_balance = ? WHERE category_id = ? AND user_id = ?`,
      [newUnallocatedBalance, category_id, user_id],
    );

    for (const item of fullyFundedItems) {
      const message = `${item.name} is fully funded.`;
      await connection.query(
        `INSERT INTO allocation_log
          (category_id, item_id, user_id, amount, allocation_type, message)
         VALUES (?, ?, ?, ?, 'fully_funded', ?)`,
        [category_id, item.item_id, user_id, 0, message],
      );
      await connection.query(
        `INSERT INTO notification (user_id, category_id, item_id, message)
         VALUES (?, ?, ?, ?)`,
        [user_id, category_id, item.item_id, message],
      );
    }

    await connection.commit();

    return {
      category_id: Number(category_id),
      unallocated_balance: newUnallocatedBalance,
      allocated_total: totalAllocated,
      allocations: allocations.map((allocation) => ({
        item_id: allocation.item_id,
        amount: allocation.value,
      })),
      fully_funded_items: fullyFundedItems,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
