import express from "express";
import { getAccountByUserId } from "../db/accountDB.js";

const router = express.Router();

router.get("/test", (req, res) => {
  res.send("Hello, World!");
});

router.route("/account").get(async (req, res) => {
  const user_id = req.user.user_id;
  const account = await getAccountByUserId(user_id);

  if (account) {
    res.status(200).send({
      ...account,
      id: "main",
      name: "Main Account",
    });
  } else {
    res.status(404).send("Main account not found.");
  }
});

export default router;
