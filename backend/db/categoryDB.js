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

const CATEGORY_PERCENT_TOTAL_INVALID = {
  error: "CATEGORY_PERCENT_TOTAL_INVALID",
  message: "Category allocations must sum to 100%.",
};

const CATEGORY_PERCENT_INVALID = {
  error: "CATEGORY_PERCENT_INVALID",
  message: "Category allocation percent must be a number between 0 and 100.",
};

const CATEGORY_REBALANCE_INVALID = {
  error: "CATEGORY_REBALANCE_INVALID",
  message:
    "Full rebalance payload must include every remaining category exactly once.",
};

class CategoryValidationError extends Error {
  constructor(payload) {
    super(payload.message);
    this.payload = payload;
  }
}

function normalizeAllocationPercent(value) {
  if (value === null || value === undefined || value === "") {
    throw new CategoryValidationError(CATEGORY_PERCENT_INVALID);
  }

  const numericValue = Number(value);
  if (
    !Number.isFinite(numericValue) ||
    numericValue < 0 ||
    numericValue > 100
  ) {
    throw new CategoryValidationError(CATEGORY_PERCENT_INVALID);
  }

  return Number(numericValue.toFixed(2));
}

function percentToCents(value) {
  return Math.round(Number(value) * 100);
}

async function getUserCategories(connection, user_id) {
  const [categories] = await connection.query(
    `
      SELECT
        category_id,
        name,
        description,
        user_id,
        allocation_percent AS allocationPercent
      FROM category
      WHERE user_id = ?
    `,
    [user_id],
  );
  return categories;
}

function assertAllocationTotal(categories) {
  const total = categories.reduce(
    (sum, category) => sum + percentToCents(category.allocationPercent),
    0,
  );

  if (total !== 10000) {
    throw new CategoryValidationError(CATEGORY_PERCENT_TOTAL_INVALID);
  }
}

function normalizeRebalancePayload(rebalance) {
  if (!Array.isArray(rebalance)) {
    return null;
  }

  return rebalance.map((allocation) => ({
    category_id: Number(allocation.category_id),
    allocationPercent: normalizeAllocationPercent(allocation.allocationPercent),
  }));
}

async function applyRebalance(connection, user_id, rebalance) {
  const normalizedRebalance = normalizeRebalancePayload(rebalance);
  if (!normalizedRebalance) {
    return;
  }

  const categories = await getUserCategories(connection, user_id);
  const categoryIds = new Set(
    categories.map((category) => category.category_id),
  );
  const rebalanceIds = new Set();

  for (const allocation of normalizedRebalance) {
    if (
      !categoryIds.has(allocation.category_id) ||
      rebalanceIds.has(allocation.category_id)
    ) {
      throw new CategoryValidationError(CATEGORY_REBALANCE_INVALID);
    }
    rebalanceIds.add(allocation.category_id);
  }

  if (rebalanceIds.size !== categoryIds.size) {
    throw new CategoryValidationError(CATEGORY_REBALANCE_INVALID);
  }

  assertAllocationTotal(normalizedRebalance);

  for (const allocation of normalizedRebalance) {
    await connection.query(
      `UPDATE category SET allocation_percent = ? WHERE category_id = ? && user_id = ?`,
      [allocation.allocationPercent, allocation.category_id, user_id],
    );
  }
}

async function assertUserAllocationTotal(connection, user_id) {
  const categories = await getUserCategories(connection, user_id);
  assertAllocationTotal(categories);
}

export function isCategoryValidationError(error) {
  return error instanceof CategoryValidationError;
}

export function getCategoryValidationPayload(error) {
  return error.payload;
}

export async function postCategory(category) {
  const {
    name,
    description = null,
    user_id = null,
    allocationPercent,
    rebalance,
  } = category;
  const normalizedAllocationPercent =
    normalizeAllocationPercent(allocationPercent);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [insertResult] = await connection.query(
      `
        INSERT INTO category (name, description, user_id, allocation_percent)
        VALUES (?, ?, ?, ?)
      `,
      [name, description, user_id, normalizedAllocationPercent],
    );

    const rebalanceWithCreatedCategory = Array.isArray(rebalance)
      ? [
          ...rebalance,
          {
            category_id: insertResult.insertId,
            allocationPercent: normalizedAllocationPercent,
          },
        ]
      : rebalance;

    await applyRebalance(connection, user_id, rebalanceWithCreatedCategory);
    await assertUserAllocationTotal(connection, user_id);
    await connection.commit();
    return 1;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getCategorys(user_id) {
  try {
    return await getUserCategories(pool, user_id);
  } catch (error) {
    console.log("Error getting category: ", error);
    return null;
  }
}

export async function updateCategory(
  category_id,
  name,
  description,
  user_id,
  allocationPercent,
  rebalance,
) {
  const normalizedAllocationPercent =
    normalizeAllocationPercent(allocationPercent);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query(
      `
        UPDATE category
        SET name = ?, description = ?, allocation_percent = ?
        WHERE category_id = ? && user_id = ?
      `,
      [name, description, normalizedAllocationPercent, category_id, user_id],
    );
    await applyRebalance(connection, user_id, rebalance);
    await assertUserAllocationTotal(connection, user_id);
    await connection.commit();
    return null;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteCategory(category_id, user_id, rebalance) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query(
      `DELETE FROM category WHERE category_id = ? && user_id = ?`,
      [category_id, user_id],
    );
    await applyRebalance(connection, user_id, rebalance);
    await assertUserAllocationTotal(connection, user_id);
    await connection.commit();
    return null;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
