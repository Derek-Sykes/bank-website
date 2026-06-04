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
    allocation_percentage = 0,
    status = "ACTIVE",
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
            INSERT INTO item (name, description, cost, balance, category_id, allocation_percentage, status, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
      [
        name,
        description,
        cost,
        balance,
        category_id,
        allocation_percentage,
        status,
        user_id,
      ],
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
    "allocation_percentage",
    "status",
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
  allocation_percentage = null,
  status = null,
) {
  const query = `UPDATE item SET name = ?, description = ?, cost = ?, balance = ?, category_id = ?, allocation_percentage = COALESCE(?, allocation_percentage), status = COALESCE(?, status) WHERE item_id = ? && user_id = ?`;

  try {
    await pool.query(query, [
      name,
      description,
      cost,
      balance,
      category_id,
      allocation_percentage,
      status,
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
  const transferAmount = Number(amount);

  if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
    return new Error("Transfer amount must be greater than 0.");
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [sourceRows] = await connection.query(
      "SELECT balance FROM item WHERE item_id = ? AND user_id = ? FOR UPDATE",
      [item_id1, user_id],
    );

    if (sourceRows.length === 0) {
      throw new Error("Source account not found.");
    }

    if (Number(sourceRows[0].balance) < transferAmount) {
      throw new Error("Transfer would make the source balance negative.");
    }

    const [result] = await connection.query(
      `
        UPDATE item
        SET balance = CASE
          WHEN item_id = ? THEN balance - ?
          WHEN item_id = ? THEN balance + ?
          ELSE balance
        END
        WHERE item_id IN (?, ?) AND user_id = ?
      `,
      [
        item_id1,
        transferAmount,
        item_id2,
        transferAmount,
        item_id1,
        item_id2,
        user_id,
      ],
    );

    if (result.affectedRows !== 2) {
      throw new Error(
        "Both transfer accounts must exist and belong to the user.",
      );
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
