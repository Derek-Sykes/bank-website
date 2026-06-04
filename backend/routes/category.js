import express from "express";
import { sendApiError } from "../src/lib/apiError.ts";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "../src/services/categoryService.ts";
import { setCategoryAllocations } from "../src/services/allocationService.ts";

const router = express.Router();

router.get("/test", (_req, res) => {
  res.send("Hello, World!");
});

router
  .route("/category")
  .get(async (req, res) => {
    try {
      const category_id = req.query.category_id ?? req.body.category_id;
      res
        .status(200)
        .json(
          await listCategories(
            req.user.user_id,
            category_id ? Number(category_id) : undefined,
          ),
        );
    } catch (error) {
      sendApiError(res, error);
    }
  })
  .post(async (req, res) => {
    try {
      res.status(201).json(await createCategory(req.user.user_id, req.body));
    } catch (error) {
      sendApiError(res, error);
    }
  })
  .put(async (req, res) => {
    try {
      const { category_id, ...input } = req.body;
      res
        .status(200)
        .json(
          await updateCategory(req.user.user_id, Number(category_id), input),
        );
    } catch (error) {
      sendApiError(res, error);
    }
  })
  .delete(async (req, res) => {
    try {
      await deleteCategory(req.user.user_id, Number(req.body.category_id));
      res.status(200).json({ message: "Category deleted" });
    } catch (error) {
      sendApiError(res, error);
    }
  });

router.put("/allocation", async (req, res) => {
  try {
    res
      .status(200)
      .json(
        await setCategoryAllocations(
          req.user.user_id,
          req.body.allocations ?? [],
        ),
      );
  } catch (error) {
    sendApiError(res, error);
  }
});

export default router;
