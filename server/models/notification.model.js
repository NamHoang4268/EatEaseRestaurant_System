import mongoose from "mongoose";

/**
 * Notification – thông báo hệ thống gửi tới nhân viên / khách hàng.
 * Hỗ trợ gửi theo cá nhân (recipientId) hoặc theo role (recipientRole).
 */
const notificationSchema = new mongoose.Schema(
    {
        // Người nhận
        recipientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            default: null, // null = broadcast cho tất cả thuộc recipientRole
        },
        recipientRole: {
            type: String,
            enum: ["ADMIN", "WAITER", "CHEF", "CASHIER", "CUSTOMER", "TABLE", null],
            default: null,
        },
        // Loại thông báo
        type: {
            type: String,
            enum: [
                "kitchen_new_order",   // đơn mới gửi lên bếp
                "kitchen_ready",       // món đã xong, cần phục vụ
                "service_request",     // khách gọi phục vụ hoặc yêu cầu hỗ trợ
                "payment_received",    // thanh toán thành công
                "payment_request",     // khách yêu cầu thanh toán
                "booking_confirmed",   // đặt bàn được xác nhận
                "booking_cancelled",   // đặt bàn bị huỷ
                "booking_reminder",    // nhắc nhở trước giờ đặt bàn
                "order_cancelled",     // đơn bị huỷ
                "order_status_update", // cập nhật trạng thái đơn
                "voucher_expiring",    // voucher sắp hết hạn
                "system",              // thông báo hệ thống
            ],
            required: true,
        },
        title: {
            type: String,
            required: [true, "Tiêu đề thông báo là bắt buộc"],
            trim: true,
        },
        message: {
            type: String,
            required: [true, "Nội dung thông báo là bắt buộc"],
        },
        // Trạng thái đọc
        isRead: {
            type: Boolean,
            default: false,
        },
        readAt: {
            type: Date,
            default: null,
        },
        // Liên kết tới tài nguyên liên quan (tuỳ chọn)
        relatedId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        relatedModel: {
            type: String,
            enum: ["tableOrder", "booking", "order", "serviceRequest", "payment", "kitchenQueue", null],
            default: null,
        },
        // Dữ liệu bổ sung (vd: tableNumber, itemName, ...)
        metadata: {
            type: Object,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ recipientRole: 1, isRead: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: -1 });

const NotificationModel = mongoose.model("notification", notificationSchema);

export default NotificationModel;
