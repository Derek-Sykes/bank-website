import express from "express";
import {
  ACTIVITY_TYPES,
  getActivityLogs,
} from "../src/services/activityService.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const user_id = req.user.user_id;
  const { categoryId, itemId, type } = req.query;

  if (type && !Object.values(ACTIVITY_TYPES).includes(type)) {
    return res.status(400).json({ message: "Invalid activity type" });
  }

  const logs = await getActivityLogs(user_id, { categoryId, itemId, type });
  if (Array.isArray(logs)) {
    return res.status(200).json(logs);
  }

  return res.status(400).json({ message: "Error getting activity logs" });
});

export default router;
