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

export const ACTIVITY_TYPES = Object.freeze({
  MONEY_ADDED: "MONEY_ADDED",
  AUTO_ALLOCATED: "AUTO_ALLOCATED",
  CATEGORY_CREATED: "CATEGORY_CREATED",
  CATEGORY_UPDATED: "CATEGORY_UPDATED",
  ITEM_CREATED: "ITEM_CREATED",
  ITEM_UPDATED: "ITEM_UPDATED",
  TARGET_UPDATED: "TARGET_UPDATED",
  ALLOCATION_CHANGED: "ALLOCATION_CHANGED",
  FULLY_FUNDED_REACHED: "FULLY_FUNDED_REACHED",
  ITEM_PURCHASED: "ITEM_PURCHASED",
  ITEM_CANCELLED: "ITEM_CANCELLED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  ACCOUNT_SOFT_DELETED: "ACCOUNT_SOFT_DELETED",
});

export async function logActivity({
  user_id,
  type,
  amount = null,
  category_id = null,
  item_id = null,
  metadata = {},
}) {
  if (!user_id || !type) {
    return null;
  }

  const metadataJson = JSON.stringify(metadata || {});

  try {
    const [result] = await pool.query(
      `
        INSERT INTO activity_log
          (user_id, type, amount, category_id, item_id, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [user_id, type, amount, category_id, item_id, metadataJson],
    );
    return result.insertId;
  } catch (error) {
    console.log("Error logging activity:", error);
    return error;
  }
}

export async function getActivityLogs(user_id, filters = {}) {
  const { categoryId = null, itemId = null, type = null } = filters;
  const where = ["al.user_id = ?"];
  const params = [user_id];

  if (categoryId) {
    where.push("al.category_id = ?");
    params.push(categoryId);
  }

  if (itemId) {
    where.push("al.item_id = ?");
    params.push(itemId);
  }

  if (type) {
    where.push("al.type = ?");
    params.push(type);
  }

  try {
    const [logs] = await pool.query(
      `
        SELECT
          al.activity_log_id AS activityLogId,
          al.created_at AS timestamp,
          al.type,
          al.amount,
          al.category_id AS categoryId,
          c.name AS categoryName,
          al.item_id AS itemId,
          i.name AS itemName,
          al.metadata
        FROM activity_log al
        LEFT JOIN category c ON c.category_id = al.category_id
        LEFT JOIN item i ON i.item_id = al.item_id
        WHERE ${where.join(" AND ")}
        ORDER BY al.created_at DESC, al.activity_log_id DESC
      `,
      params,
    );

    return logs.map((log) => ({
      ...log,
      metadata:
        typeof log.metadata === "string"
          ? JSON.parse(log.metadata)
          : log.metadata,
    }));
  } catch (error) {
    console.log("Error getting activity logs:", error);
    return error;
  }
}
