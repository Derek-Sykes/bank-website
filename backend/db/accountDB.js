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

const MAIN_ACCOUNT_ID = "main";

export async function postAccount(user_id, balance = 5000) {
  try {
    await pool.query(
      `
        INSERT INTO account (user_id, balance)
        VALUES (?, ?)
        `,
      [user_id, balance],
    );
    return null;
  } catch (error) {
    console.log("Error creating account: ", error);
    return error;
  }
}

export async function getAccountByUserId(user_id) {
  try {
    const [accounts] = await pool.query(
      `
        SELECT account_id, user_id, balance
        FROM account
        WHERE user_id = ?
        `,
      [user_id],
    );
    return accounts[0] || null;
  } catch (error) {
    console.log("Error getting account: ", error);
    return null;
  }
}

export async function transferFunds(
  fromAccountId,
  toAccountId,
  amount,
  user_id,
) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return "Transfer amount must be greater than zero.";
  }

  const fromIsMain = String(fromAccountId) === MAIN_ACCOUNT_ID;
  const toIsMain = String(toAccountId) === MAIN_ACCOUNT_ID;

  if (fromIsMain && toIsMain) {
    return "Cannot transfer from main account to main account.";
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (fromIsMain) {
      const [mainUpdate] = await connection.query(
        `
          UPDATE account
          SET balance = balance - ?
          WHERE user_id = ? AND balance >= ?
          `,
        [numericAmount, user_id, numericAmount],
      );

      if (mainUpdate.affectedRows !== 1) {
        throw new Error("Insufficient funds in main account.");
      }

      const [itemUpdate] = await connection.query(
        `
          UPDATE item
          SET balance = balance + ?
          WHERE item_id = ? AND user_id = ?
          `,
        [numericAmount, toAccountId, user_id],
      );

      if (itemUpdate.affectedRows !== 1) {
        throw new Error("Destination account not found.");
      }
    } else if (toIsMain) {
      const [itemUpdate] = await connection.query(
        `
          UPDATE item
          SET balance = balance - ?
          WHERE item_id = ? AND user_id = ? AND balance >= ?
          `,
        [numericAmount, fromAccountId, user_id, numericAmount],
      );

      if (itemUpdate.affectedRows !== 1) {
        throw new Error("Source account not found or has insufficient funds.");
      }

      const [mainUpdate] = await connection.query(
        `
          UPDATE account
          SET balance = balance + ?
          WHERE user_id = ?
          `,
        [numericAmount, user_id],
      );

      if (mainUpdate.affectedRows !== 1) {
        throw new Error("Main account not found.");
      }
    } else {
      const [sourceUpdate] = await connection.query(
        `
          UPDATE item
          SET balance = balance - ?
          WHERE item_id = ? AND user_id = ? AND balance >= ?
          `,
        [numericAmount, fromAccountId, user_id, numericAmount],
      );

      if (sourceUpdate.affectedRows !== 1) {
        throw new Error("Source account not found or has insufficient funds.");
      }

      const [destinationUpdate] = await connection.query(
        `
          UPDATE item
          SET balance = balance + ?
          WHERE item_id = ? AND user_id = ?
          `,
        [numericAmount, toAccountId, user_id],
      );

      if (destinationUpdate.affectedRows !== 1) {
        throw new Error("Destination account not found.");
      }
    }

    await connection.commit();
    return null;
  } catch (error) {
    await connection.rollback();
    console.log("Error transferring funds: ", error);
    return error.message || error;
  } finally {
    connection.release();
  }
}

export async function transferCategoryBalanceToAccount(category_id, user_id) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [totals] = await connection.query(
      `
        SELECT COALESCE(SUM(balance), 0) AS total_balance
        FROM item
        WHERE category_id = ? AND user_id = ?
        `,
      [category_id, user_id],
    );
    const totalBalance = Number(totals[0]?.total_balance || 0);

    if (totalBalance > 0) {
      const [accountUpdate] = await connection.query(
        `
          UPDATE account
          SET balance = balance + ?
          WHERE user_id = ?
          `,
        [totalBalance, user_id],
      );

      if (accountUpdate.affectedRows !== 1) {
        throw new Error("Main account not found.");
      }
    }

    await connection.commit();
    return null;
  } catch (error) {
    await connection.rollback();
    console.log("Error transferring category balance to main account: ", error);
    return error.message || error;
  } finally {
    connection.release();
  }
}
