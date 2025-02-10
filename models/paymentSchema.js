const mongoose = require('mongoose');
const {Schema} = mongoose


const paymentSchema = new Schema({
  user_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }, 
  coupon_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Coupon', 
    required: false 
  }, 
  wallet_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Wallet', 
    required: false 
  }, 
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'canceled', 'partially_refunded', 'refunded', 'failed'],
    required: true ,
    default: 'pending'
  }, 
  currency: { 
    type: String, 
    default: 'INR' 
  },
  payment_method: { 
    type: String, 
    enum: ['COD', 'creditCard', 'bank', 'upi','wallet'],
    required: true 
  }, 
  razorpay_order_id: {
    type: String,
    required: false,
    index: true,
  },
  razorpay_payment_id: {
    type: String,
    required: false,
    index: true,
  },
  refunded_amount: {
    type: Number,
    default: 0, // Initialize to 0
  },
  date: { 
    type: Date, 
    default: Date.now 
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
paymentSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

// Create the Payment model
const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
