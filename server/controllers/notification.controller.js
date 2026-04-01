import NotificationModel from "../models/notification.model.js";

// GET /api/notification
// Lấy thông báo cho user hiện tại hoặc theo role
export const getNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20, isRead } = req.query;
        const userId = req.userId;
        const userRole = req.user?.role;

        const filter = {
            $or: [
                { recipientId: userId },
                { recipientRole: userRole, recipientId: null },
            ],
        };

        if (isRead !== undefined) {
            filter.isRead = isRead === "true";
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await NotificationModel.countDocuments(filter);
        const notifications = await NotificationModel.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const unreadCount = await NotificationModel.countDocuments({
            ...filter,
            isRead: false,
        });

        return res.status(200).json({
            success: true,
            data: {
                notifications,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit)),
                },
                unreadCount,
            },
        });
    } catch (error) {
        console.error("getNotifications error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/notification/:id/read
// Đánh dấu một thông báo là đã đọc
export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await NotificationModel.findByIdAndUpdate(
            id,
            { isRead: true, readAt: new Date() },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: "Không tìm thấy thông báo." });
        }

        return res.status(200).json({ success: true, data: notification });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/notification/read-all
// Đánh dấu tất cả thông báo của user là đã đọc
export const markAllAsRead = async (req, res) => {
    try {
        const userId = req.userId;
        const userRole = req.user?.role;

        const filter = {
            $or: [
                { recipientId: userId },
                { recipientRole: userRole, recipientId: null },
            ],
            isRead: false,
        };

        const result = await NotificationModel.updateMany(filter, {
            isRead: true,
            readAt: new Date(),
        });

        return res.status(200).json({
            success: true,
            message: `Đã đánh dấu ${result.modifiedCount} thông báo là đã đọc.`,
        });
    } catch (error) {
        console.error("markAllAsRead error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/notification/:id
// Xoá một thông báo
export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await NotificationModel.findByIdAndDelete(id);

        if (!notification) {
            return res.status(404).json({ success: false, message: "Không tìm thấy thông báo." });
        }

        return res.status(200).json({ success: true, message: "Đã xoá thông báo." });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/notification (Admin only)
// Tạo thông báo thủ công
export const createNotification = async (req, res) => {
    try {
        const { recipientId, recipientRole, type, title, message, relatedId, relatedModel, metadata } = req.body;

        if (!type || !title || !message) {
            return res.status(400).json({ success: false, message: "Vui lòng cung cấp type, title và message." });
        }

        const notification = await NotificationModel.create({
            recipientId: recipientId || null,
            recipientRole: recipientRole || null,
            type,
            title,
            message,
            relatedId: relatedId || null,
            relatedModel: relatedModel || null,
            metadata: metadata || {},
        });

        // Emit qua socket nếu có
        const io = req.app.get("io");
        if (io) {
            io.emit("notification:new", notification);
        }

        return res.status(201).json({ success: true, data: notification });
    } catch (error) {
        console.error("createNotification error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/notification/unread-count
// Đếm số thông báo chưa đọc
export const getUnreadCount = async (req, res) => {
    try {
        const userId = req.userId;
        const userRole = req.user?.role;

        const count = await NotificationModel.countDocuments({
            $or: [
                { recipientId: userId },
                { recipientRole: userRole, recipientId: null },
            ],
            isRead: false,
        });

        return res.status(200).json({ success: true, count });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
