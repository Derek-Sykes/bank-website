import express from "express";
import { authenticateToken } from "../middleware/authenticateToken.js";
import { sendApiError } from "../src/lib/apiError.ts";
import {
  deleteUser,
  getSession,
  login,
  logout,
  signup,
  updateUser,
} from "../src/services/authService.ts";

const router = express.Router();

router.get("/test", (_req, res) => {
  res.send("Hello, World!");
});

router.post("/login", async (req, res) => {
  try {
    const { accessToken, refreshToken, userDetails } = await login(
      req.body.user ?? req.body,
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.status(200).json({ accessToken, userDetails });
  } catch (error) {
    sendApiError(res, error);
  }
});

router.post("/register", async (req, res) => {
  try {
    const { accessToken, refreshToken, userDetails } = await signup(
      req.body.user ?? req.body,
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.status(201).json({ accessToken, userDetails });
  } catch (error) {
    sendApiError(res, error);
  }
});

router.post("/logout", async (req, res) => {
  try {
    await logout(req.cookies.refreshToken);
    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "None",
      secure: true,
    });
    res.status(204).send();
  } catch (error) {
    sendApiError(res, error);
  }
});

router.get("/session", async (req, res) => {
  try {
    res.json(await getSession(req.cookies.refreshToken));
  } catch (error) {
    sendApiError(res, error);
  }
});

router
  .route("/user")
  .put(authenticateToken, async (req, res) => {
    try {
      res
        .status(200)
        .json({ userDetails: await updateUser(req.user.user_id, req.body) });
    } catch (error) {
      sendApiError(res, error);
    }
  })
  .delete(authenticateToken, async (req, res) => {
    try {
      await deleteUser(req.user.user_id, req.body.user_id);
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      sendApiError(res, error);
    }
  });

export default router;
