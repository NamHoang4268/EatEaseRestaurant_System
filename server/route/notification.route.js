import express from "express";
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    getUnreadCount,
} from "../controllers/notification.controller.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Yêu cầu xác thực cho tất cả route thông báo
router.use(auth);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.post("/", createNotification);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

export default router;
