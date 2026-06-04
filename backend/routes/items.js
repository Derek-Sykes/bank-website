import express from "express";

const router = express.Router();
import {
  postItem,
  getItemBy,
  updateItem,
  deleteItem,
  transfer,
} from "./../db/itemDB.js";
import {
  ACTIVITY_TYPES,
  logActivity,
} from "../src/services/activityService.js";

router.get("/test", (req, res) => {
  res.send("Hello, World!");
});
// insert an item into the db with only the name being required as input
router
  .route("/item")
  .get(async (req, res) => {
    const { type, value } = req.query;
    let user_id;
    if (req.user) {
      user_id = req.user.user_id;
    } else {
      user_id = null;
    }
    let items = await getItemBy(user_id, type, value);
    if (items) {
      res.status(200).send(items);
    } else {
      res.status(400).send("Error getting items see console.");
    }
  })
  .post(async (req, res) => {
    const { name, description, cost, category_id } = req.body;
    const balance = 0;
    let user_id;
    if (req.user) {
      user_id = req.user.user_id;
    } else {
      user_id = null;
    }

    const item = { name, description, cost, balance, category_id, user_id };
    let feedback = await postItem(item);
    if (Number.isInteger(feedback)) {
      await logActivity({
        user_id,
        type: ACTIVITY_TYPES.ITEM_CREATED,
        category_id,
        item_id: feedback,
        amount: cost,
        metadata: { name, description, cost, balance, category_id },
      });
      res.status(200).send("Successful post");
    } else {
      res.status(400).send("Error posting");
    }
  })
  .put(async (req, res) => {
    const {
      item_id,
      name = null,
      description = null,
      cost = null,
      balance = null,
      category_id = null,
    } = req.body;
    let user_id = req.user.user_id;
    const existingItems = await getItemBy(user_id, "item_id", item_id);
    const previous = existingItems?.[0] || null;
    let error = await updateItem(
      item_id,
      name,
      description,
      cost,
      balance,
      category_id,
      user_id,
    );
    if (error) {
      res.status(400).send("Error updating item, see console.");
    } else {
      const newBalance = Number(balance ?? 0);
      const oldBalance = Number(previous?.balance ?? 0);
      const newCost = Number(cost ?? 0);
      const oldCost = Number(previous?.cost ?? 0);
      const sharedMetadata = {
        previous,
        updated: { item_id, name, description, cost, balance, category_id },
      };

      await logActivity({
        user_id,
        type: ACTIVITY_TYPES.ITEM_UPDATED,
        category_id,
        item_id,
        amount: balance,
        metadata: sharedMetadata,
      });

      if (previous && String(previous.cost ?? "") !== String(cost ?? "")) {
        await logActivity({
          user_id,
          type: ACTIVITY_TYPES.TARGET_UPDATED,
          category_id,
          item_id,
          amount: cost,
          metadata: { previousTarget: oldCost, newTarget: newCost },
        });
      }

      if (
        previous &&
        String(previous.category_id ?? "") !== String(category_id ?? "")
      ) {
        await logActivity({
          user_id,
          type: ACTIVITY_TYPES.ALLOCATION_CHANGED,
          category_id,
          item_id,
          amount: balance,
          metadata: {
            previousCategoryId: previous.category_id,
            newCategoryId: category_id,
          },
        });
      }

      if (newBalance > oldBalance) {
        await logActivity({
          user_id,
          type: ACTIVITY_TYPES.MONEY_ADDED,
          category_id,
          item_id,
          amount: newBalance - oldBalance,
          metadata: { previousBalance: oldBalance, newBalance },
        });
      }

      if (newCost > 0 && oldBalance < newCost && newBalance >= newCost) {
        await logActivity({
          user_id,
          type: ACTIVITY_TYPES.FULLY_FUNDED_REACHED,
          category_id,
          item_id,
          amount: newBalance,
          metadata: { target: newCost },
        });
      }

      res.status(200).send("Item updated");
    }
  })
  .delete(async (req, res) => {
    const { item_id, action = "cancelled" } = req.body;
    let user_id = req.user.user_id;
    const existingItems = await getItemBy(user_id, "item_id", item_id);
    const item = existingItems?.[0] || null;
    let error = await deleteItem(item_id, user_id);
    if (error) {
      res.status(400).send("Error deleting item, see console.");
    } else {
      await logActivity({
        user_id,
        type:
          action === "purchased"
            ? ACTIVITY_TYPES.ITEM_PURCHASED
            : ACTIVITY_TYPES.ITEM_CANCELLED,
        category_id: item?.category_id,
        item_id,
        amount: item?.balance,
        metadata: { item, action },
      });
      res.status(200).send("Item deleted");
    }
  });

router.route("/transfer").put(async (req, res) => {
  const { item_id1, item_id2, amount = null, autoAllocate = false } = req.body;
  const user_id = req.user.user_id;
  const destinationItems = await getItemBy(user_id, "item_id", item_id2);
  const destinationBefore = destinationItems?.[0] || null;
  let error = await transfer(item_id1, item_id2, amount, user_id);
  if (error) {
    res.status(400).send("Error updating item, see console.");
  } else {
    const numericAmount = Number(amount ?? 0);
    await logActivity({
      user_id,
      type: autoAllocate
        ? ACTIVITY_TYPES.AUTO_ALLOCATED
        : ACTIVITY_TYPES.ALLOCATION_CHANGED,
      item_id: item_id2,
      category_id: destinationBefore?.category_id,
      amount,
      metadata: {
        fromItemId: item_id1,
        toItemId: item_id2,
        autoAllocate,
      },
    });

    if (
      destinationBefore?.cost &&
      Number(destinationBefore.balance) < Number(destinationBefore.cost) &&
      Number(destinationBefore.balance) + numericAmount >=
        Number(destinationBefore.cost)
    ) {
      await logActivity({
        user_id,
        type: ACTIVITY_TYPES.FULLY_FUNDED_REACHED,
        item_id: item_id2,
        category_id: destinationBefore.category_id,
        amount: Number(destinationBefore.balance) + numericAmount,
        metadata: { target: Number(destinationBefore.cost) },
      });
    }

    res.status(200).send("Item updated");
  }
});

export default router;
