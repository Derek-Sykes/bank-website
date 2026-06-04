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

const SYSTEM_SOURCE = "system";

export async function createSystemNotification({
  user_id,
  type,
  title,
  message,
  metadata = null,
}) {
  if (!user_id || !type || !title || !message) {
    return null;
  }

  const metadataValue = metadata ? JSON.stringify(metadata) : null;

  try {
    const [result] = await pool.query(
      `
        INSERT INTO notification (user_id, source, type, title, message, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [user_id, SYSTEM_SOURCE, type, title, message, metadataValue],
    );
    return result.insertId;
  } catch (error) {
    console.log("Error creating notification: ", error);
    return null;
  }
}

export async function getNotifications(user_id) {
  try {
    const [notifications] = await pool.query(
      `
        SELECT *
        FROM notification
        WHERE user_id = ?
        ORDER BY created_at DESC
      `,
      [user_id],
    );
    return notifications;
  } catch (error) {
    console.log("Error getting notifications: ", error);
    return null;
  }
}

export async function markNotificationRead(notification_id, user_id) {
  try {
    const [result] = await pool.query(
      `
        UPDATE notification
        SET is_read = TRUE, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
        WHERE notification_id = ? AND user_id = ?
      `,
      [notification_id, user_id],
    );
    return result.affectedRows > 0 ? null : "Notification not found";
  } catch (error) {
    console.log("Error marking notification read: ", error);
    return error;
  }
}

export async function markAllNotificationsRead(user_id) {
  try {
    await pool.query(
      `
        UPDATE notification
        SET is_read = TRUE, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
        WHERE user_id = ? AND is_read = FALSE
      `,
      [user_id],
    );
    return null;
  } catch (error) {
    console.log("Error marking notifications read: ", error);
    return error;
  }
}

export async function deleteNotification(notification_id, user_id) {
  try {
    const [result] = await pool.query(
      `DELETE FROM notification WHERE notification_id = ? AND user_id = ?`,
      [notification_id, user_id],
    );
    return result.affectedRows > 0 ? null : "Notification not found";
  } catch (error) {
    console.log("Error deleting notification: ", error);
    return error;
  }
}

export async function deleteAllNotifications(user_id) {
  try {
    await pool.query(`DELETE FROM notification WHERE user_id = ?`, [user_id]);
    return null;
  } catch (error) {
    console.log("Error deleting notifications: ", error);
    return error;
  }
}
