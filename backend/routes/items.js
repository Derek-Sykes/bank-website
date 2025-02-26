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
    if (feedback === 1) {
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
      res.status(200).send("Item updated");
    }
  })
  .delete(async (req, res) => {
    const { item_id } = req.body;
    let user_id = req.user.user_id;
    let error = await deleteItem(item_id, user_id);
    if (error) {
      res.status(400).send("Error deleting item, see console.");
    } else {
      res.status(200).send("Item deleted");
    }
  });

router.route("/transfer").put(async (req, res) => {
  const { item_id1, item_id2, amount = null } = req.body;
  const user_id = req.user.user_id;
  let error = await transfer(item_id1, item_id2, amount, user_id);
  if (error) {
    res.status(400).send("Error updating item, see console.");
  } else {
    res.status(200).send("Item updated");
  }
});

// router.post("/makeItem", async (req, res) => {
//   const { name, description, cost, category_id } = req.body;
//   let user_id;
//   if (req.user) {
//     user_id = req.user.user_id;
//   } else {
//     user_id = null;
//   }

//   const item = { name, description, cost, category_id, user_id };
//   let feedback = await postItem(item);
//   if (feedback === 1) {
//     res.status(200).send("Successful post");
//   } else {
//     res.status(400).send("Error posting");
//   }
// });
// // get item by one column and user_id
// router.get("/getItem", async (req, res) => {
//   const { type, value } = req.body;
//   let user_id;
//   if (req.user) {
//     user_id = req.user.user_id;
//   } else {
//     user_id = null;
//   }
//   let items = await getItemBy(user_id, type, value);
//   if (items) {
//     res.status(200).send(items);
//   } else {
//     res.status(400).send("Error getting items see console.");
//   }
// });
export default router;
