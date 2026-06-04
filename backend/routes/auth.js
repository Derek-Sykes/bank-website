import express from "express";
import {
  createPasswordResetToken,
  resetPasswordWithToken,
} from "../db/userDB.js";
import { validatePassword } from "../utils/passwordValidation.js";

const router = express.Router();

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const resetToken = await createPasswordResetToken(email);

    if (resetToken && process.env.NODE_ENV === "development") {
      console.log(
        `[development only] Password reset token for ${resetToken.email}: ${resetToken.token} (expires in ${resetToken.expiresInMinutes} minutes)`,
      );
    }

    return res.status(200).json({
      message:
        "If that email is registered, a password reset link will be sent.",
    });
  } catch (error) {
    console.error("Error creating password reset token:", error);
    return res.status(500).json({ message: "Unable to start password reset" });
  }
});

router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Reset token is required" });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  try {
    const error = await resetPasswordWithToken(token, password);
    if (error) {
      return res.status(400).json({ message: error });
    }

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({ message: "Unable to reset password" });
  }
});

export default router;
