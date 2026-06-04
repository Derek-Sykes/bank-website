import express from "express";
import {
  createItem,
  deleteItem,
  getItemsBy,
  transfer,
  updateItem,
} from "../services/itemService.js";

const router = express.Router();

function toOptionalNumber(value: unknown): number | undefined {
  return value === undefined ? undefined : Number(value);
}

function toNullableNumber(value: unknown): number | null {
  return value === undefined || value === null ? null : Number(value);
}

router.get("/test", (_req, res) => {
  res.send("Hello, World!");
});

router
  .route("/item")
  .get(async (req, res) => {
    const { type, value } = req.query;
    const user_id = req.user?.user_id ?? null;
    const items = await getItemsBy(
      user_id,
      typeof type === "string" ? type : undefined,
      typeof value === "string" ? value : null,
    );
    res.status(200).send(items);
  })
  .post(async (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const {
      name,
      description,
      cost,
      category_id,
      account_id = null,
    } = req.body;
    await createItem({
      name,
      description,
      cost: toNullableNumber(cost),
      balance: 0,
      category_id: toNullableNumber(category_id),
      account_id: toNullableNumber(account_id),
      user_id: req.user.user_id,
    });
    res.status(200).send("Successful post");
  })
  .put(async (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const {
      item_id,
      name,
      description,
      cost,
      balance,
      category_id,
      account_id,
    } = req.body;
    await updateItem(
      Number(item_id),
      {
        name,
        description,
        cost: toOptionalNumber(cost),
        balance: toOptionalNumber(balance),
        category_id:
          category_id === null ? null : toOptionalNumber(category_id),
        account_id: account_id === null ? null : toOptionalNumber(account_id),
      },
      req.user.user_id,
    );
    res.status(200).send("Item updated");
  })
  .delete(async (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { item_id } = req.body;
    await deleteItem(Number(item_id), req.user.user_id);
    res.status(200).send("Item deleted");
  });

router.route("/transfer").put(async (req, res) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { item_id1, item_id2, amount = null } = req.body;
  await transfer(
    Number(item_id1),
    Number(item_id2),
    Number(amount),
    req.user.user_id,
  );
  res.status(200).send("Item updated");
});

export default router;
