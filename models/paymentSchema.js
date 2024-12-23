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
    enum: ['paid', 'failed', 'pending'], 
    required: true 
  }, 
  date: { 
    type: Date, 
    default: Date.now 
  },
  pay_method: { 
    type: String, 
    enum: ['UPI', 'bank transfer', 'credit card', 'cash on delivery'], 
    required: true 
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
