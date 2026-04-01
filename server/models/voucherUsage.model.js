import mongoose from "mongoose";

/**
 * VoucherUsage – theo dõi chi tiết việc sử dụng voucher theo từng đơn hàng.
 * Bổ sung cho mảng usersUsed trong VoucherModel bằng cách lưu đầy đủ context.
 */
const voucherUsageSchema = new mongoose.Schema(
    {
        voucherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "voucher",
            required: [true, "Vui lòng cung cấp voucher"],
        },
        voucherCode: {
            type: String,
            required: [true, "Vui lòng cung cấp mã voucher"],
            uppercase: true,
            trim: true,
        },
        // Người dùng áp dụng (null nếu khách vãng lai)
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            default: null,
        },
        // Đơn hàng liên quan (một trong ba loại)
        tableOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "tableOrder",
            default: null,
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "order",
            default: null,
        },
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "booking",
            default: null,
        },
        // Giá trị đơn hàng trước/sau giảm giá
        originalAmount: {
            type: Number,
            required: [true, "Vui lòng cung cấp số tiền gốc"],
            min: 0,
        },
        discountAmount: {
            type: Number,
            required: [true, "Vui lòng cung cấp số tiền giảm"],
            min: 0,
        },
        finalAmount: {
            type: Number,
            required: [true, "Vui lòng cung cấp số tiền cuối"],
            min: 0,
        },
        usedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
voucherUsageSchema.index({ voucherId: 1 });
voucherUsageSchema.index({ userId: 1 });
voucherUsageSchema.index({ voucherCode: 1 });
voucherUsageSchema.index({ tableOrderId: 1 });
voucherUsageSchema.index({ orderId: 1 });
voucherUsageSchema.index({ usedAt: -1 });

const VoucherUsageModel = mongoose.model("voucherUsage", voucherUsageSchema);

export default VoucherUsageModel;
