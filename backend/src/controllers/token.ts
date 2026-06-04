import "dotenv/config";
import jwt from "jsonwebtoken";
import { updateRefreshToken } from "../services/userService.js";
import type { AuthenticatedUser } from "../types/auth.js";

const accessTokenSecret = process.env.ACCESS_TOKEN;
const refreshTokenSecret = process.env.REFRESH_TOKEN;

export function generateAccessToken(user: AuthenticatedUser): string {
  if (!accessTokenSecret) {
    throw new Error("ACCESS_TOKEN environment variable is required");
  }

  return jwt.sign(user, accessTokenSecret, { expiresIn: "15m" });
}

export async function generateRefreshToken(
  user: AuthenticatedUser,
): Promise<string> {
  if (!refreshTokenSecret) {
    throw new Error("REFRESH_TOKEN environment variable is required");
  }

  const refreshToken = jwt.sign(user, refreshTokenSecret, { expiresIn: "1d" });
  await updateRefreshToken(refreshToken, user.user_id);
  return refreshToken;
}
