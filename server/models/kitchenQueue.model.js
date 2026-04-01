import mongoose from "mongoose";

/**
 * KitchenQueue – theo dõi từng món ăn trong hàng đợi bếp.
 * Mỗi item được đẩy vào đây khi khách gửi đơn lên bếp (sentToKitchen).
 * Trạng thái diễn ra: pending → cooking → ready → served | cancelled
 */
const kitchenQueueSchema = new mongoose.Schema(
    {
        // Liên kết đến đơn hàng tại bàn
        tableOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "tableOrder",
            required: true,
        },
        // _id của sub-document item trong tableOrder.items
        orderItemId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        // Thông tin món
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "product",
            required: true,
        },
        productName: {
            type: String,
            required: true,
        },
        // Thông tin bàn
        tableId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "table",
            required: true,
        },
        tableNumber: {
            type: String,
            required: true,
        },
        // Số lượng & ghi chú
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        note: {
            type: String,
            default: "",
        },
        // Trạng thái xử lý bếp
        status: {
            type: String,
            enum: ["pending", "cooking", "ready", "served", "cancelled"],
            default: "pending",
        },
        // Độ ưu tiên (số nhỏ = ưu tiên cao hơn)
        priority: {
            type: Number,
            default: 0,
        },
        // Mốc thời gian
        sentAt: {
            type: Date,
            default: Date.now,
        },
        cookingStartAt: {
            type: Date,
            default: null,
        },
        readyAt: {
            type: Date,
            default: null,
        },
        servedAt: {
            type: Date,
            default: null,
        },
        cancelledAt: {
            type: Date,
            default: null,
        },
        // Đầu bếp được phân công (nếu có)
        assignedChefId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes để query nhanh theo bàn, trạng thái
kitchenQueueSchema.index({ tableOrderId: 1 });
kitchenQueueSchema.index({ tableId: 1, status: 1 });
kitchenQueueSchema.index({ status: 1, sentAt: 1 });
kitchenQueueSchema.index({ assignedChefId: 1, status: 1 });

const KitchenQueueModel = mongoose.model("kitchenQueue", kitchenQueueSchema);

export default KitchenQueueModel;
