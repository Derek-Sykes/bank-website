import express from "express";
import { sendApiError } from "../src/lib/apiError.ts";
import {
  addMoney,
  cancel,
  purchase,
  transfer,
} from "../src/services/accountService.ts";
import { setItemAllocations } from "../src/services/allocationService.ts";
import {
  createItem,
  deleteItem,
  getItems,
  updateItem,
} from "../src/services/itemService.ts";

const router = express.Router();

router.get("/test", (_req, res) => {
  res.send("Hello, World!");
});

router
  .route("/item")
  .get(async (req, res) => {
    try {
      const { type, value } = req.query;
      res
        .status(200)
        .json(await getItems(req.user?.user_id ?? null, type, value));
    } catch (error) {
      sendApiError(res, error);
    }
  })
  .post(async (req, res) => {
    try {
      res.status(201).json(await createItem(req.user.user_id, req.body));
    } catch (error) {
      sendApiError(res, error);
    }
  })
  .put(async (req, res) => {
    try {
      const { item_id, ...input } = req.body;
      res
        .status(200)
        .json(await updateItem(req.user.user_id, Number(item_id), input));
    } catch (error) {
      sendApiError(res, error);
    }
  })
  .delete(async (req, res) => {
    try {
      await deleteItem(req.user.user_id, Number(req.body.item_id));
      res.status(200).json({ message: "Item deleted" });
    } catch (error) {
      sendApiError(res, error);
    }
  });

router.put("/transfer", async (req, res) => {
  try {
    const { item_id1, item_id2, amount } = req.body;
    res
      .status(200)
      .json(
        await transfer(
          req.user.user_id,
          Number(item_id1),
          Number(item_id2),
          Number(amount),
        ),
      );
  } catch (error) {
    sendApiError(res, error);
  }
});

router.post("/add-money", async (req, res) => {
  try {
    res
      .status(200)
      .json(await addMoney(req.user.user_id, Number(req.body.amount)));
  } catch (error) {
    sendApiError(res, error);
  }
});

router.post("/purchase", async (req, res) => {
  try {
    res
      .status(200)
      .json(
        await purchase(
          req.user.user_id,
          Number(req.body.item_id),
          req.body.amount === undefined ? undefined : Number(req.body.amount),
        ),
      );
  } catch (error) {
    sendApiError(res, error);
  }
});

router.post("/cancel", async (req, res) => {
  try {
    res
      .status(200)
      .json(await cancel(req.user.user_id, Number(req.body.item_id)));
  } catch (error) {
    sendApiError(res, error);
  }
});

router.put("/allocation", async (req, res) => {
  try {
    res
      .status(200)
      .json(
        await setItemAllocations(req.user.user_id, req.body.allocations ?? []),
      );
  } catch (error) {
    sendApiError(res, error);
  }
});

export default router;
