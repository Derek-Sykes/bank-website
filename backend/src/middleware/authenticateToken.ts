import "dotenv/config";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { generateAccessToken } from "../controllers/token.js";
import { verifyRefreshToken } from "../services/userService.js";
import type { AuthenticatedUser } from "../types/auth.js";

const accessTokenSecret = process.env.ACCESS_TOKEN;
const refreshTokenSecret = process.env.REFRESH_TOKEN;

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!accessTokenSecret || !refreshTokenSecret) {
    res.status(500).json({ message: "Token secrets are not configured" });
    return;
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Access token is missing" });
    return;
  }

  jwt.verify(token, accessTokenSecret, async (err, decoded) => {
    if (!err && decoded) {
      req.user = decoded as AuthenticatedUser;
      next();
      return;
    }

    if (err?.name !== "TokenExpiredError") {
      res.status(403).json({ message: "Invalid access token." });
      return;
    }

    const refreshToken = req.cookies.refreshToken as string | undefined;
    const sessionUser = await verifyRefreshToken(refreshToken);

    if (!refreshToken || !sessionUser) {
      res.status(401).json({ message: "Refresh token is missing! Login!" });
      return;
    }

    jwt.verify(
      refreshToken,
      refreshTokenSecret,
      (refreshErr, refreshDecoded) => {
        if (refreshErr?.name === "TokenExpiredError") {
          res
            .status(403)
            .json({ message: "Refresh token expired, Login again." });
          return;
        }

        if (refreshErr || !refreshDecoded) {
          res.status(403).json({ message: "Invalid refresh token." });
          return;
        }

        const user = refreshDecoded as AuthenticatedUser;
        req.user = user;
        const newAccessToken = generateAccessToken(user);
        res.json({ accessToken: newAccessToken, message: "retry request" });
      },
    );
  });
}
