import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

/**
 * Payment – lưu trữ lịch sử giao dịch thanh toán.
 * Có thể liên kết với tableOrder (thanh toán tại bàn),
 * booking (đặt cọc), hoặc order (đơn online).
 */
const paymentSchema = new mongoose.Schema(
    {
        // Liên kết đơn hàng (một trong các loại)
        tableOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "tableOrder",
            default: null,
        },
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "booking",
            default: null,
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "order",
            default: null,
        },
        // Thông tin thanh toán
        amount: {
            type: Number,
            required: [true, "Vui lòng nhập số tiền"],
            min: [0, "Số tiền không âm"],
        },
        currency: {
            type: String,
            default: "VND",
            uppercase: true,
        },
        method: {
            type: String,
            enum: ["cash", "stripe", "vnpay", "momo", "bank_transfer", "other"],
            required: [true, "Vui lòng chọn phương thức thanh toán"],
        },
        status: {
            type: String,
            enum: ["pending", "completed", "failed", "refunded", "partially_refunded"],
            default: "pending",
        },
        // Thông tin giao dịch từ cổng thanh toán
        transactionId: {
            type: String,
            default: null,
        },
        stripeSessionId: {
            type: String,
            default: null,
        },
        stripePaymentIntentId: {
            type: String,
            default: null,
        },
        // Hoàn tiền
        refundId: {
            type: String,
            default: null,
        },
        refundAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        refundedAt: {
            type: Date,
            default: null,
        },
        refundReason: {
            type: String,
            default: "",
        },
        // Nhân viên xử lý (thu ngân)
        processedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            default: null,
        },
        processedAt: {
            type: Date,
            default: null,
        },
        // Khuyến mãi
        voucherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "voucher",
            default: null,
        },
        discountAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        // Điểm thưởng
        pointsUsed: {
            type: Number,
            default: 0,
            min: 0,
        },
        pointsEarned: {
            type: Number,
            default: 0,
            min: 0,
        },
        // Ghi chú
        notes: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
paymentSchema.index({ tableOrderId: 1 });
paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ method: 1 });
paymentSchema.index({ processedBy: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ stripeSessionId: 1 });
paymentSchema.index({ transactionId: 1 });

paymentSchema.plugin(mongoosePaginate);

const PaymentModel = mongoose.model("payment", paymentSchema);

export default PaymentModel;
