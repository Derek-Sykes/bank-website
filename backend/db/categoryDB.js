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
