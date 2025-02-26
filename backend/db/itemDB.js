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
