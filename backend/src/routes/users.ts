import "dotenv/config";
import express from "express";
import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../controllers/token.js";
import { authenticateToken } from "../middleware/authenticateToken.js";
import { createItem } from "../services/itemService.js";
import {
  createUser,
  deleteUser,
  removeRefreshToken,
  updateUser,
  verifyLogin,
} from "../services/userService.js";
import type { AuthenticatedUser } from "../types/auth.js";

const router = express.Router();
const refreshTokenSecret = process.env.REFRESH_TOKEN;

router.get("/test", (_req, res) => {
  res.send("Hello, World!");
});

router.post("/login", async (req, res) => {
  const user = req.body.user;
  const userDetails = await verifyLogin(user);

  if (!userDetails) {
    res.status(401).json({ message: "Invalid User" });
    return;
  }

  const accessToken = generateAccessToken(userDetails);
  const refreshToken = await generateRefreshToken(userDetails);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.status(200).json({ accessToken, userDetails });
});

router.post("/register", async (req, res) => {
  const user = req.body.user;

  if (!user) {
    res.status(401).json({ message: "User details are required" });
    return;
  }

  const error = await createUser(user);
  if (error) {
    res.status(400).send(error);
    return;
  }

  const userDetails = await verifyLogin(user);
  if (!userDetails) {
    res.status(500).json({ message: "Unable to verify newly created user" });
    return;
  }

  await createItem({
    name: "Main Account",
    description: "Main Account",
    cost: null,
    balance: 5000,
    category_id: null,
    user_id: userDetails.user_id,
  });

  const accessToken = generateAccessToken(userDetails);
  const refreshToken = await generateRefreshToken(userDetails);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.status(201).json({ accessToken, userDetails });
});

router.post("/logout", async (req, res) => {
  const refreshToken = req.cookies.refreshToken as string | undefined;
  await removeRefreshToken(refreshToken);
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "none",
    secure: true,
  });
  res.status(204).json({ message: "Logged out successfully" });
});

router.get("/session", async (req, res) => {
  const token = req.cookies.refreshToken as string | undefined;
  if (!token) {
    res.status(401).json({ error: "No active session" });
    return;
  }

  if (!refreshTokenSecret) {
    res
      .status(500)
      .json({ error: "REFRESH_TOKEN environment variable is required" });
    return;
  }

  try {
    const user = jwt.verify(token, refreshTokenSecret) as AuthenticatedUser;
    res.json(user);
  } catch {
    res.status(403).json({ error: "Invalid session" });
  }
});

router
  .route("/user")
  .put(authenticateToken, async (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    await updateUser(req.body, req.user.user_id);
    res.status(200).json({ message: "User updated successfully" });
  })
  .delete(authenticateToken, async (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    await deleteUser(req.body, req.user.user_id);
    res.status(200).json({ message: "User deleted successfully" });
  });

export default router;
