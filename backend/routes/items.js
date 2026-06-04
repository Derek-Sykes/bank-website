import express from "express";

const router = express.Router();
import {
  postItem,
  getItemBy,
  updateItem,
  deleteItem,
  transfer,
} from "./../db/itemDB.js";

router.get("/test", (req, res) => {
  res.send("Hello, World!");
});

router
  .route("/item")
  .get(async (req, res) => {
    const { type, value } = req.query;
    const user_id = req.user ? req.user.user_id : null;
    const items = await getItemBy(user_id, type, value);
    if (items) {
      res.status(200).send(items);
    } else {
      res.status(400).send("Error getting items see console.");
    }
  })
  .post(async (req, res) => {
    const {
      name,
      description,
      targetAmount,
      allocatedAmount = 0,
      allocationPercent = 0,
      status,
      category_id,
    } = req.body;
    const user_id = req.user ? req.user.user_id : null;

    const item = {
      name,
      description,
      targetAmount,
      allocatedAmount,
      allocationPercent,
      status,
      category_id,
      user_id,
    };
    const feedback = await postItem(item);
    if (feedback === 1) {
      res.status(200).send("Successful post");
    } else {
      res.status(400).send(feedback || "Error posting");
    }
  })
  .put(async (req, res) => {
    const { item_id, ...updateData } = req.body;
    const user_id = req.user.user_id;
    const error = await updateItem(item_id, updateData, user_id);
    if (error) {
      res.status(400).send(error);
    } else {
      res.status(200).send("Item updated");
    }
  })
  .delete(async (req, res) => {
    const { item_id } = req.body;
    const user_id = req.user.user_id;
    const error = await deleteItem(item_id, user_id);
    if (error) {
      res.status(400).send("Error deleting item, see console.");
    } else {
      res.status(200).send("Item deleted");
    }
  });

router.route("/transfer").put(async (req, res) => {
  const { item_id1, item_id2, amount = null } = req.body;
  const user_id = req.user.user_id;
  const error = await transfer(item_id1, item_id2, amount, user_id);
  if (error) {
    res.status(400).send(error);
  } else {
    res.status(200).send("Item updated");
  }
});

export default router;
