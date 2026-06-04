import express from "express";
import { addMoney } from "../db/moneyDB.js";

const router = express.Router();

router.post("/add", async (req, res) => {
  const { amount, note = null } = req.body;
  const userId = req.user.user_id;

  const result = await addMoney(userId, amount, note);

  if (result.error) {
    res.status(400).json({ message: result.error });
    return;
  }

  res.status(200).json(result);
});

export default router;
