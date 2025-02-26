import jwt from "jsonwebtoken";
import { updateRefreshToken } from "../db/userDB.js";
import dotenv from "dotenv";
dotenv.config();

export function generateAccessToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: "15m" });
}

// Generate Refresh Token
export async function generateRefreshToken(user) {
  const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN, {
    expiresIn: "1d",
  });
  // add refresh token to db for user
  let error = await updateRefreshToken(refreshToken, user.user_id);
  if (error) {
    console.error(error);
  }
  return refreshToken;
}
