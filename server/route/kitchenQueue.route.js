import express from "express";
import {
    getKitchenQueue,
    getReadyItems,
    getQueueByOrder,
    updateQueueItemStatus,
    addItemsToQueue,
} from "../controllers/kitchenQueue.controller.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Xem hàng đợi bếp (Chef / Waiter) – yêu cầu đăng nhập
router.get("/", auth, getKitchenQueue);
router.get("/ready", auth, getReadyItems);
router.get("/order/:tableOrderId", auth, getQueueByOrder);

// Cập nhật trạng thái từng món – yêu cầu đăng nhập
router.patch("/:id/status", auth, updateQueueItemStatus);

// Thêm món vào hàng đợi (khi gửi đơn lên bếp) – yêu cầu đăng nhập
router.post("/bulk", auth, addItemsToQueue);

export default router;
