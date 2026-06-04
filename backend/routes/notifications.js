import express from "express";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
} from "./../db/notificationDB.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const user_id = req.user.user_id;
  const notifications = await getNotifications(user_id);
  if (notifications) {
    res.status(200).send(notifications);
  } else {
    res.status(400).send("Error getting notifications, see console.");
  }
});

router.patch("/:id/read", async (req, res) => {
  const user_id = req.user.user_id;
  const error = await markNotificationRead(req.params.id, user_id);
  if (error) {
    res.status(404).send("Error marking notification read, see console.");
  } else {
    res.status(200).send("Notification marked as read");
  }
});

router.post("/mark-all-read", async (req, res) => {
  const user_id = req.user.user_id;
  const error = await markAllNotificationsRead(user_id);
  if (error) {
    res.status(400).send("Error marking notifications read, see console.");
  } else {
    res.status(200).send("Notifications marked as read");
  }
});

router.delete("/:id", async (req, res) => {
  const user_id = req.user.user_id;
  const error = await deleteNotification(req.params.id, user_id);
  if (error) {
    res.status(404).send("Error deleting notification, see console.");
  } else {
    res.status(200).send("Notification deleted");
  }
});

router.delete("/", async (req, res) => {
  const user_id = req.user.user_id;
  const error = await deleteAllNotifications(user_id);
  if (error) {
    res.status(400).send("Error deleting notifications, see console.");
  } else {
    res.status(200).send("Notifications deleted");
  }
});

export default router;
