import express from "express";
import {
  changeUserPassword,
  getUserById,
  logUserEvent,
  softDeleteUser,
  updateAccountProfile,
} from "../db/userDB.js";

const router = express.Router();

const publicUser = (user) => ({
  user_id: user.user_id,
  f_name: user.f_name,
  l_name: user.l_name,
  email: user.email,
  softDeleted: Boolean(user.softDeleted),
});

const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return "New password must be at least 8 characters.";
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "New password must include at least one letter and one number.";
  }
  return null;
};

router.get("/", async (req, res) => {
  const user = await getUserById(req.user.user_id);
  if (!user || user.softDeleted) {
    return res.status(404).json({ message: "Account not found" });
  }

  return res.status(200).json(publicUser(user));
});

router.patch("/", async (req, res) => {
  const { f_name, l_name } = req.body;
  if (!f_name?.trim() || !l_name?.trim()) {
    return res
      .status(400)
      .json({ message: "First and last name are required." });
  }

  const updatedUser = await updateAccountProfile(req.user.user_id, {
    f_name: f_name.trim(),
    l_name: l_name.trim(),
  });

  if (!updatedUser) {
    return res.status(400).json({ message: "Unable to update account." });
  }

  return res.status(200).json(publicUser(updatedUser));
});

router.post("/change-password", async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword) {
    return res.status(400).json({ message: "Current password is required." });
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  const result = await changeUserPassword(
    req.user.user_id,
    currentPassword,
    newPassword,
  );

  if (result === "INVALID_CURRENT_PASSWORD") {
    return res.status(401).json({ message: "Current password is incorrect." });
  }

  if (result !== null) {
    return res.status(400).json({ message: "Unable to change password." });
  }

  await logUserEvent(req.user.user_id, "PASSWORD_CHANGED");
  return res.status(200).json({ message: "Password changed successfully." });
});

router.post("/soft-delete", async (req, res) => {
  const error = await softDeleteUser(req.user.user_id);
  if (error) {
    return res.status(400).json({ message: "Unable to delete account." });
  }

  await logUserEvent(req.user.user_id, "ACCOUNT_SOFT_DELETED");
  res.clearCookie("refreshToken", { httpOnly: true });
  return res
    .status(200)
    .json({ message: "Account deleted. User data retained." });
});

export default router;
