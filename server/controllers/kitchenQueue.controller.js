import KitchenQueueModel from "../models/kitchenQueue.model.js";
import TableOrderModel from "../models/tableOrder.model.js";
import NotificationModel from "../models/notification.model.js";
import mongoose from "mongoose";

const VALID_QUEUE_STATUSES = ["pending", "cooking", "ready", "served", "cancelled"];

// GET /api/kitchen-queue
// Lấy tất cả món đang trong hàng đợi bếp (pending + cooking)
export const getKitchenQueue = async (req, res) => {
    try {
        const { status, tableId } = req.query;
        const filter = {};

        if (status) {
            // Validate each status value against the allowed enum
            const requestedStatuses = status.split(",").filter((s) => VALID_QUEUE_STATUSES.includes(s));
            if (requestedStatuses.length === 0) {
                return res.status(400).json({ success: false, message: "Giá trị trạng thái không hợp lệ." });
            }
            filter.status = { $in: requestedStatuses };
        } else {
            filter.status = { $in: ["pending", "cooking"] };
        }

        if (tableId) {
            if (!mongoose.Types.ObjectId.isValid(tableId)) {
                return res.status(400).json({ success: false, message: "tableId không hợp lệ." });
            }
            filter.tableId = new mongoose.Types.ObjectId(tableId);
        }

        const items = await KitchenQueueModel.find(filter)
            .populate("productId", "name image preparationTime")
            .populate("tableId", "tableNumber location")
            .populate("assignedChefId", "name")
            .sort({ priority: -1, sentAt: 1 });

        return res.status(200).json({ success: true, data: items });
    } catch (error) {
        console.error("getKitchenQueue error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/kitchen-queue/ready
// Lấy các món đã xong, chờ phục vụ
export const getReadyItems = async (req, res) => {
    try {
        const items = await KitchenQueueModel.find({ status: "ready" })
            .populate("productId", "name image")
            .populate("tableId", "tableNumber location")
            .sort({ readyAt: 1 });

        return res.status(200).json({ success: true, data: items });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/kitchen-queue/order/:tableOrderId
// Lấy kitchen queue của một đơn hàng cụ thể
export const getQueueByOrder = async (req, res) => {
    try {
        const { tableOrderId } = req.params;
        const items = await KitchenQueueModel.find({ tableOrderId })
            .populate("productId", "name image")
            .sort({ sentAt: 1 });

        return res.status(200).json({ success: true, data: items });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/kitchen-queue/:id/status
// Cập nhật trạng thái món trong hàng đợi bếp
export const updateQueueItemStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, assignedChefId } = req.body;

        const validStatuses = ["cooking", "ready", "served", "cancelled"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Trạng thái không hợp lệ. Chọn: ${validStatuses.join(", ")}`,
            });
        }

        const item = await KitchenQueueModel.findById(id);
        if (!item) {
            return res.status(404).json({ success: false, message: "Không tìm thấy mục trong hàng đợi." });
        }

        item.status = status;
        if (status === "cooking") {
            item.cookingStartAt = new Date();
            if (assignedChefId) item.assignedChefId = assignedChefId;
        }
        if (status === "ready") item.readyAt = new Date();
        if (status === "served") item.servedAt = new Date();
        if (status === "cancelled") item.cancelledAt = new Date();

        await item.save();

        // Đồng bộ trạng thái sang tableOrder.items
        try {
            const order = await TableOrderModel.findById(item.tableOrderId);
            if (order) {
                const orderItem = order.items.id(item.orderItemId);
                if (orderItem) {
                    const kitchenStatusMap = {
                        cooking: "cooking",
                        ready: "ready",
                        served: "served",
                        cancelled: "pending", // fallback
                    };
                    orderItem.kitchenStatus = kitchenStatusMap[status] || orderItem.kitchenStatus;
                    if (status === "cooking") orderItem.cookingStartAt = item.cookingStartAt;
                    if (status === "ready") orderItem.readyAt = item.readyAt;
                    if (status === "served") orderItem.servedAt = item.servedAt;
                    await order.save();
                }
            }
        } catch (syncErr) {
            console.error("Lỗi đồng bộ trạng thái tableOrder:", syncErr);
        }

        // Tạo notification khi món xong
        if (status === "ready") {
            try {
                await NotificationModel.create({
                    recipientRole: "WAITER",
                    type: "kitchen_ready",
                    title: "Món ăn đã sẵn sàng",
                    message: `${item.productName} (x${item.quantity}) – Bàn ${item.tableNumber} đã sẵn sàng phục vụ.`,
                    relatedId: item._id,
                    relatedModel: "kitchenQueue",
                    metadata: {
                        tableNumber: item.tableNumber,
                        productName: item.productName,
                        quantity: item.quantity,
                    },
                });
            } catch (notifErr) {
                console.error("Lỗi tạo notification:", notifErr);
            }
        }

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            if (status === "ready") {
                io.emit("dish:ready", {
                    kitchenQueueId: id,
                    orderId: item.tableOrderId,
                    tableId: item.tableId,
                    tableNumber: item.tableNumber,
                    productName: item.productName,
                    quantity: item.quantity,
                });
            } else {
                io.emit("kitchen:status_update", {
                    kitchenQueueId: id,
                    status,
                    tableId: item.tableId,
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: `Cập nhật trạng thái thành "${status}"`,
            data: item,
        });
    } catch (error) {
        console.error("updateQueueItemStatus error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/kitchen-queue/bulk
// Thêm nhiều món vào hàng đợi bếp (gọi khi sentToKitchen)
export const addItemsToQueue = async (req, res) => {
    try {
        const { tableOrderId } = req.body;

        if (!tableOrderId) {
            return res.status(400).json({ success: false, message: "Vui lòng cung cấp tableOrderId." });
        }

        if (!mongoose.Types.ObjectId.isValid(tableOrderId)) {
            return res.status(400).json({ success: false, message: "tableOrderId không hợp lệ." });
        }

        const order = await TableOrderModel.findById(tableOrderId).populate("tableId", "tableNumber");
        if (!order) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng." });
        }

        // Chỉ thêm các món chưa được gửi lên bếp (status = pending)
        const pendingItems = order.items.filter((item) => item.kitchenStatus === "pending");

        if (pendingItems.length === 0) {
            return res.status(400).json({ success: false, message: "Không có món nào cần gửi lên bếp." });
        }

        const queueItems = pendingItems.map((item) => ({
            tableOrderId: order._id,
            orderItemId: item._id,
            productId: item.productId,
            productName: item.name,
            tableId: order.tableId._id || order.tableId,
            tableNumber: order.tableNumber,
            quantity: item.quantity,
            note: item.note || "",
            status: "pending",
            sentAt: new Date(),
        }));

        const created = await KitchenQueueModel.insertMany(queueItems);

        // Tạo notification cho bếp
        try {
            await NotificationModel.create({
                recipientRole: "CHEF",
                type: "kitchen_new_order",
                title: "Đơn hàng mới từ bàn " + order.tableNumber,
                message: `Bàn ${order.tableNumber} vừa gửi ${created.length} món lên bếp.`,
                relatedId: order._id,
                relatedModel: "tableOrder",
                metadata: {
                    tableNumber: order.tableNumber,
                    itemCount: created.length,
                },
            });
        } catch (notifErr) {
            console.error("Lỗi tạo notification:", notifErr);
        }

        return res.status(201).json({
            success: true,
            message: `Đã thêm ${created.length} món vào hàng đợi bếp.`,
            data: created,
        });
    } catch (error) {
        console.error("addItemsToQueue error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
