const mongoose = require('mongoose');
const { type } = require('os');
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
        // required: function () { return this.payment_method !== 'COD'; }
        required: false
    },
    payment_method: {
        type: String,
        enum: ['COD', 'creditCard', 'bank', 'upi'],
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
    shipping_chrg: {
        type: Number,
        required: true,
        default: 0,
    },
    total: {
        type: Number,
        required: true
    },
    netAmount: {
        type: Number,
        required: true
    },
    tax_amount: {
        type: Number,
        default: 0,
    },
    discount: {
        type: Number,
        default: 0
    }, // Coupon discount
    offer_discount: {
        type: Number,
        default: 0
    }, // Offer discount
    coupon_discount: {
        type: Number,
        default: 0
    },
    payment_status: {
        type: String,
        enum: ['pending', 'complete', 'failed'],
        default: 'pending'
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
