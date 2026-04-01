import express from "express";
import {
    createPayment,
    getPayments,
    getPaymentById,
    getPaymentsByTableOrder,
    processRefund,
    getPaymentStats,
} from "../controllers/payment.controller.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Admin / Cashier – xem & quản lý thanh toán
router.get("/", auth, getPayments);
router.get("/stats/summary", auth, getPaymentStats);
router.get("/table-order/:tableOrderId", auth, getPaymentsByTableOrder);
router.get("/:id", auth, getPaymentById);

// Tạo bản ghi thanh toán
router.post("/", auth, createPayment);

// Hoàn tiền
router.patch("/:id/refund", auth, processRefund);

export default router;
