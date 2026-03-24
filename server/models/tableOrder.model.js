import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    note: {
        type: String,
        default: ''
    },
    // ===== Kitchen Workflow Fields =====
    kitchenStatus: {
        type: String,
        enum: ['pending', 'cooking', 'ready', 'served'],
        default: 'pending'
    },
    sentAt: {         // Khi đơn được chuyển lên bếp
        type: Date,
        default: null
    },
    cookingStartAt: { // Khi bếp bắt đầu nấu
        type: Date,
        default: null
    },
    readyAt: {        // Khi món xong
        type: Date,
        default: null
    },
    servedAt: {       // Khi waiter đã phục vụ ra bàn
        type: Date,
        default: null
    },
    // ===================================
    addedAt: {
        type: Date,
        default: Date.now
    }
});

const tableOrderSchema = new mongoose.Schema({
    tableId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'table',
        required: true
    },
    tableNumber: {
        type: String,
        required: true
    },
    // Khách hàng (tùy chọn – có thể là Guest)
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        default: null
    },
    isGuest: {
        type: Boolean,
        default: true
    },
    guestName: {
        type: String,
        default: ''
    },
    // ===========================
    items: [orderItemSchema],
    subTotal: {
        type: Number,
        required: true,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    voucherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Voucher',
        default: null
    },
    total: {
        type: Number,
        required: true,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'pending_payment', 'paid', 'cancelled'],
        default: 'active'
    },
    // Trạng thái gửi bếp
    sentToKitchen: {
        type: Boolean,
        default: false
    },
    sentToKitchenAt: {
        type: Date,
        default: null
    },
    paymentRequest: {
        type: String,
        enum: ['at_counter', 'online', null],
        default: null
    },
    checkedOutAt: {
        type: Date,
        default: null
    },
    paidAt: {
        type: Date,
        default: null
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'online', null],
        default: null
    },
    // Stripe online payment
    stripeSessionId: {
        type: String,
        default: null
    },
    expectedTotal: {
        type: Number,
        default: null
    },
    billChangedAfterPayment: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes
tableOrderSchema.index({ tableId: 1, status: 1 });
tableOrderSchema.index({ tableNumber: 1, status: 1 });
tableOrderSchema.index({ customerId: 1 });

const TableOrderModel = mongoose.model('tableOrder', tableOrderSchema);

export default TableOrderModel;
