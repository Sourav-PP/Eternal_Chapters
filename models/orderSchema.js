const mongoose = require('mongoose');
const { Schema } = mongoose


const orderSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    payment_id: {
        type: Schema.Types.ObjectId,
        ref: 'Payment',
        required: true
    },
    address_id: {
        type: Schema.Types.ObjectId,
        ref: 'Address',
        required: true
    },
    order_date: {
        type: Date,
        required: true,
        default: Date.now
    },
    delivery_date: {
        type: Date,
        required: false
    }, // Can be null initially
    status: {
        type: String,
        enum: ['pending', 'shipped', 'delivered', 'canceled'],
        required: true,
        default: 'pending',
    },
    shipping_chrg: {
        type: Number,
        required: true
    },
    total: {
        type: Number,
        required: true
    },
    netAmount: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    },
});

// Middleware to update `updated_at` before saving
orderSchema.pre('save', function (next) {
    this.updated_at = Date.now();
    next();
});

// Create the Order model
const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
