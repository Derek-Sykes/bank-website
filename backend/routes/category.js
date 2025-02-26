import express from "express";

const router = express.Router();
import {
  postCategory,
  getCategorys,
  updateCategory,
  deleteCategory,
} from "./../db/categoryDB.js";

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
      res.status(400).send("Error getting categorys see console.");
    }
  })
  .post(async (req, res) => {
    const { name, description = null } = req.body;
    let user_id = req.user.user_id;

    const category = { name, description, user_id };
    let feedback = await postCategory(category);
    if (feedback === 1) {
      res.status(200).send("Successful post");
    } else {
      res.status(400).send("Error posting");
    }
  })
  .put(async (req, res) => {
    const { category_id, name, description = null } = req.body;
    let user_id = req.user.user_id;
    let error = await updateCategory(category_id, name, description, user_id);
    if (error) {
      res.status(400).send("Error updating category, see console.");
    } else {
      res.status(200).send("Category updated");
    }
  })
  .delete(async (req, res) => {
    //when options has a value it should call the function that redistributes the money according to the rules.
    const { category_id, options } = req.body;
    let user_id = req.user.user_id;
    let error = await deleteCategory(category_id, user_id);
    if (error) {
      res.status(400).send("Error deleting category, see console.");
    } else {
      res.status(200).send("category deleted");
    }
  });

export default router;
