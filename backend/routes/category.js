import express from "express";

const router = express.Router();
import {
  postCategory,
  getCategorys,
  updateCategory,
  deleteCategory,
  isCategoryValidationError,
  getCategoryValidationPayload,
} from "./../db/categoryDB.js";

const CATEGORY_OPERATION_ERROR = {
  error: "CATEGORY_OPERATION_ERROR",
  message: "Unable to complete category operation.",
};

function sendCategoryError(res, error) {
  if (isCategoryValidationError(error)) {
    return res.status(400).json(getCategoryValidationPayload(error));
  }

  console.log("Category operation error:", error);
  return res.status(400).json(CATEGORY_OPERATION_ERROR);
}

router.get("/test", (req, res) => {
  res.send("Hello, World!");
});
// insert an category into the db with only the name being required as input
router
  .route("/category")
  .get(async (req, res) => {
    const { category_id = null } = req.body;
    let user_id = req.user.user_id;
    let categorys = await getCategorys(user_id);
    if (category_id && categorys) {
      let category = categorys.find((item) => item.category_id === category_id);
      res.status(200).send(category);
    } else if (!category_id && categorys) {
      res.status(200).send(categorys);
    } else {
      res.status(400).json(CATEGORY_OPERATION_ERROR);
    }
  })
  .post(async (req, res) => {
    const { name, description = null, allocationPercent, rebalance } = req.body;
    let user_id = req.user.user_id;

    const category = {
      name,
      description,
      user_id,
      allocationPercent,
      rebalance,
    };
    try {
      await postCategory(category);
      res.status(200).json({ message: "Successful post" });
    } catch (error) {
      sendCategoryError(res, error);
    }
  })
  .put(async (req, res) => {
    const {
      category_id,
      name,
      description = null,
      allocationPercent,
      rebalance,
    } = req.body;
    let user_id = req.user.user_id;
    try {
      await updateCategory(
        category_id,
        name,
        description,
        user_id,
        allocationPercent,
        rebalance,
      );
      res.status(200).json({ message: "Category updated" });
    } catch (error) {
      sendCategoryError(res, error);
    }
  })
  .delete(async (req, res) => {
    //when options has a value it should call the function that redistributes the money according to the rules.
    const { category_id, options = {}, rebalance } = req.body;
    let user_id = req.user.user_id;
    try {
      await deleteCategory(
        category_id,
        user_id,
        rebalance || options.rebalance,
      );
      res.status(200).json({ message: "category deleted" });
    } catch (error) {
      sendCategoryError(res, error);
    }
  });

export default router;
