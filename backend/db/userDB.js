import mysql from "mysql2";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
dotenv.config();

const pool = mysql
  .createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  })
  .promise();

// takes in user containing username and password and returns its details if login success otherwise it returns null.
export async function verifyLogin(user) {
  const { email, password } = user;
  let [usersdb] = await pool.query(`SELECT * FROM user WHERE email = ?`, [
    email,
  ]);
  usersdb = usersdb[0];
  // if the email is in db
  if (usersdb) {
    // compare passwords
    let verified = await verifyPassword(password, usersdb.password);
    if (verified) {
      let userDetails = {
        user_id: usersdb.user_id,
        f_name: usersdb.f_name,
        l_name: usersdb.l_name,
        email: usersdb.email,
      };
      return userDetails;
    }
  }
  // if its anything if incorrect
  return null;
}
export async function postUser(user) {
  let { f_name, l_name, email, password } = user;
  let hash = await hashPassword(password);
  try {
    await pool.query(
      `
        INSERT INTO user (f_name, l_name, email, password)
        VALUES (?, ?, ?, ?)
        `,
      [f_name, l_name, email, hash],
    );
    console.log("CREATED!!");
    return null;
  } catch (error) {
    let errno = error.errno;
    switch (errno) {
      case 1062:
        console.log("\n\n ERROR: \n", error, "\n\n");
        console.log("Email already in use");
        return "Email already in use";
      // space for more possible error codes from sql
      default:
        console.log("Error creating user: ", error);
        break;
    }
  }
}

export async function updateUser(user, user_id) {
  let { f_name, l_name, email, password = null } = user;
  let query;
  let hash;
  if (password) {
    hash = await hashPassword(password);
    query = `UPDATE user SET f_name = ?, l_name = ?, email = ?, password = ? WHERE user_id = ?`;

    try {
      await pool.query(query, [f_name, l_name, email, hash, user_id]);
      return null;
    } catch (error) {
      console.log(error);
      return error;
    }
  } else {
    query = `UPDATE user SET f_name = ?, l_name = ?, email = ? WHERE user_id = ?`;
    try {
      await pool.query(query, [f_name, l_name, email, user_id]);
      return null;
    } catch (error) {
      console.log(error);
      return error;
    }
  }
}
export async function deleteUser(user, user_id) {
  if (user.user_id === user_id) {
    const query = `DELETE FROM user WHERE user_id = ?`;
    try {
      await pool.query(query, [user_id]);
      return null;
    } catch (error) {
      console.log(error);
      return error;
    }
  } else {
    console.log("You can't delete another user");
    return "ERROR cannot delete another user";
  }
}

export async function updateRefreshToken(refreshToken, user_id) {
  try {
    await pool.query(
      `
        UPDATE user SET refresh_token = ? WHERE user_id = ?
        `,
      [refreshToken, user_id],
    );
    return null;
  } catch (error) {
    let errno = error.errno;
    switch (errno) {
      case 1062:
        return error;
      // space for more possible error codes from sql
      default:
        //console.log("Error creating user: ", error);
        return error;
    }
  }
}

export async function verifyRefreshToken(refreshToken) {
  try {
    let user =
      (
        await pool.query(
          `
        SELECT * FROM user WHERE refresh_token = ?
        `,
          [refreshToken],
        )
      )[0] || null;
    return user;
  } catch (error) {
    let errno = error.errno;
    switch (errno) {
      case 1062:
        console.log(error);
        return null;
      // space for more possible error codes from sql
      default:
        //console.log("Error creating user: ", error);
        console.log(error);
        return null;
    }
  }
}

export async function removeRefreshTokenDB(refreshToken) {
  try {
    await pool.query(
      `
        UPDATE user SET refresh_token = NULL WHERE refresh_token = ?;
        `,
      [refreshToken],
    );
  } catch (error) {
    let errno = error.errno;
    switch (errno) {
      case 1062:
        return error;
      // space for more possible error codes from sql
      default:
        //console.log("Error creating user: ", error);
        return error;
    }
  }
}

async function verifyPassword(inputPassword, storedHashedPassword) {
  try {
    const isMatch = await bcrypt.compare(inputPassword, storedHashedPassword);
    return isMatch;
  } catch (err) {
    console.error("Error verifying password:", err);
  }
}
async function hashPassword(password) {
  const saltRounds = 10;
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
  } catch (err) {
    console.error("Error hashing password:", err);
  }
}
