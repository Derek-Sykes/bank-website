import express from "express";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "../services/categoryService.js";

const router = express.Router();

router.get("/test", (_req, res) => {
  res.send("Hello, World!");
});

router
  .route("/category")
  .get(async (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const category_id = Number(req.body.category_id ?? 0) || null;
    const categories = await getCategories(req.user.user_id);

    if (category_id) {
      const category = categories.find(
        (item) => item.category_id === category_id,
      );
      res.status(200).send(category ?? null);
      return;
    }

    res.status(200).send(categories);
  })
  .post(async (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { name, description = null } = req.body;
    await createCategory({ name, description, user_id: req.user.user_id });
    res.status(200).send("Successful post");
  })
  .put(async (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { category_id, name, description = null } = req.body;
    await updateCategory(
      Number(category_id),
      name,
      description,
      req.user.user_id,
    );
    res.status(200).send("Category updated");
  })
  .delete(async (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { category_id } = req.body;
    await deleteCategory(Number(category_id), req.user.user_id);
    res.status(200).send("category deleted");
  });

export default router;
