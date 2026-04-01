import PaymentModel from "../models/payment.model.js";
import TableOrderModel from "../models/tableOrder.model.js";
import NotificationModel from "../models/notification.model.js";
import VoucherUsageModel from "../models/voucherUsage.model.js";
import VoucherModel from "../models/voucher.model.js";
import mongoose from "mongoose";

const VALID_PAYMENT_METHODS = ["cash", "stripe", "vnpay", "momo", "bank_transfer", "other"];

// POST /api/payment
// Tạo bản ghi thanh toán mới (chủ yếu gọi từ controller tableOrder hoặc webhook)
export const createPayment = async (req, res) => {
    try {
        const {
            tableOrderId,
            bookingId,
            orderId,
            amount,
            method,
            transactionId,
            stripeSessionId,
            stripePaymentIntentId,
            voucherId,
            discountAmount,
            pointsUsed,
            pointsEarned,
            notes,
        } = req.body;

        if (!amount || !method) {
            return res.status(400).json({ success: false, message: "Vui lòng cung cấp số tiền và phương thức thanh toán." });
        }

        if (!VALID_PAYMENT_METHODS.includes(method)) {
            return res.status(400).json({ success: false, message: "Phương thức thanh toán không hợp lệ." });
        }

        // Validate ObjectId fields to prevent NoSQL injection
        const safeTableOrderId = tableOrderId && mongoose.Types.ObjectId.isValid(tableOrderId) ? new mongoose.Types.ObjectId(tableOrderId) : null;
        const safeBookingId = bookingId && mongoose.Types.ObjectId.isValid(bookingId) ? new mongoose.Types.ObjectId(bookingId) : null;
        const safeOrderId = orderId && mongoose.Types.ObjectId.isValid(orderId) ? new mongoose.Types.ObjectId(orderId) : null;
        const safeVoucherId = voucherId && mongoose.Types.ObjectId.isValid(voucherId) ? new mongoose.Types.ObjectId(voucherId) : null;

        const payment = await PaymentModel.create({
            tableOrderId: safeTableOrderId,
            bookingId: safeBookingId,
            orderId: safeOrderId,
            amount,
            method,
            status: "completed",
            transactionId: transactionId || null,
            stripeSessionId: stripeSessionId || null,
            stripePaymentIntentId: stripePaymentIntentId || null,
            voucherId: safeVoucherId,
            discountAmount: discountAmount || 0,
            pointsUsed: pointsUsed || 0,
            pointsEarned: pointsEarned || 0,
            notes: notes || "",
            processedBy: req.userId || null,
            processedAt: new Date(),
        });

        // Nếu có voucherUsage cần ghi
        if (safeVoucherId && safeTableOrderId) {
            try {
                const order = await TableOrderModel.findById(safeTableOrderId);
                if (order) {
                    // Lấy mã voucher từ request hoặc tra cứu từ DB
                    let resolvedVoucherCode = req.body.voucherCode || "";
                    if (!resolvedVoucherCode) {
                        const voucher = await VoucherModel.findById(safeVoucherId).select("code");
                        resolvedVoucherCode = voucher?.code || "";
                    }
                    if (resolvedVoucherCode) {
                        await VoucherUsageModel.create({
                            voucherId: safeVoucherId,
                            voucherCode: resolvedVoucherCode,
                            userId: req.userId || null,
                            tableOrderId: safeTableOrderId,
                            originalAmount: order.subTotal,
                            discountAmount: discountAmount || 0,
                            finalAmount: order.total,
                        });
                    }
                }
            } catch (usageErr) {
                console.error("Lỗi ghi VoucherUsage:", usageErr);
            }
        }

        // Thông báo cho admin/cashier
        try {
            await NotificationModel.create({
                recipientRole: "CASHIER",
                type: "payment_received",
                title: "Thanh toán thành công",
                message: `Đơn hàng đã được thanh toán ${amount.toLocaleString("vi-VN")} VND qua ${method}.`,
                relatedId: payment._id,
                relatedModel: "payment",
                metadata: { amount, method },
            });
        } catch (notifErr) {
            console.error("Lỗi tạo notification:", notifErr);
        }

        return res.status(201).json({ success: true, data: payment });
    } catch (error) {
        console.error("createPayment error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/payment
// Lấy danh sách thanh toán (Admin/Cashier)
export const getPayments = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, method, startDate, endDate } = req.query;
        const filter = {};

        if (status) filter.status = status;
        if (method) filter.method = method;
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { createdAt: -1 },
            populate: [
                { path: "tableOrderId", select: "tableNumber total" },
                { path: "bookingId", select: "customerName phone bookingDate" },
                { path: "processedBy", select: "name email" },
                { path: "voucherId", select: "code name" },
            ],
        };

        const result = await PaymentModel.paginate(filter, options);

        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error("getPayments error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/payment/:id
// Chi tiết một giao dịch
export const getPaymentById = async (req, res) => {
    try {
        const { id } = req.params;
        const payment = await PaymentModel.findById(id)
            .populate("tableOrderId", "tableNumber total items")
            .populate("bookingId", "customerName phone bookingDate")
            .populate("orderId", "orderId totalAmt")
            .populate("processedBy", "name email")
            .populate("voucherId", "code name discountType discountValue");

        if (!payment) {
            return res.status(404).json({ success: false, message: "Không tìm thấy giao dịch." });
        }

        return res.status(200).json({ success: true, data: payment });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/payment/table-order/:tableOrderId
// Lấy lịch sử thanh toán của một đơn bàn
export const getPaymentsByTableOrder = async (req, res) => {
    try {
        const { tableOrderId } = req.params;
        const payments = await PaymentModel.find({ tableOrderId })
            .populate("processedBy", "name email")
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, data: payments });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/payment/:id/refund
// Xử lý hoàn tiền
export const processRefund = async (req, res) => {
    try {
        const { id } = req.params;
        const { refundAmount, refundId, refundReason } = req.body;

        const payment = await PaymentModel.findById(id);
        if (!payment) {
            return res.status(404).json({ success: false, message: "Không tìm thấy giao dịch." });
        }

        if (payment.status === "refunded") {
            return res.status(400).json({ success: false, message: "Giao dịch đã được hoàn tiền trước đó." });
        }

        const refund = refundAmount || payment.amount;

        payment.refundAmount = refund;
        payment.refundId = refundId || null;
        payment.refundReason = refundReason || "";
        payment.refundedAt = new Date();
        payment.status = refund >= payment.amount ? "refunded" : "partially_refunded";

        await payment.save();

        return res.status(200).json({ success: true, message: "Hoàn tiền thành công.", data: payment });
    } catch (error) {
        console.error("processRefund error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/payment/stats/summary
// Thống kê doanh thu (Admin)
export const getPaymentStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const matchStage = { status: "completed" };

        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) matchStage.createdAt.$lte = new Date(endDate);
        }

        const stats = await PaymentModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$amount" },
                    totalTransactions: { $count: {} },
                    totalDiscount: { $sum: "$discountAmount" },
                    avgOrderValue: { $avg: "$amount" },
                },
            },
        ]);

        const byMethod = await PaymentModel.aggregate([
            { $match: matchStage },
            { $group: { _id: "$method", total: { $sum: "$amount" }, count: { $count: {} } } },
            { $sort: { total: -1 } },
        ]);

        return res.status(200).json({
            success: true,
            data: {
                summary: stats[0] || { totalRevenue: 0, totalTransactions: 0, totalDiscount: 0, avgOrderValue: 0 },
                byMethod,
            },
        });
    } catch (error) {
        console.error("getPaymentStats error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
