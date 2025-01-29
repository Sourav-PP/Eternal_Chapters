const mongoose = require('mongoose');
const { type } = require('os');
const {Schema} = mongoose
 
// Define the Coupon schema
const couponSchema = new Schema({
  is_active: { 
    type: String, 
    enum: ['active', 'inactive'], 
    required: true,
    default: 'active'
  },
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  coupon_type: { 
    type: String, 
    enum: ['fixed', 'percentage'],
    required: true 
  },
  discount_value: { 
    type: Number, 
    required: true, 
    min: 0 
  }, 
  max_discount_amount: { 
    type: Number, 
    required: false, 
    min: 0 
  },
  minimum_purchase_amount: { 
    type: Number, 
    required: false, 
    min: 0 
  },
  description: { 
    type: String, 
    trim: true 
  },
  limit: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  expiry_date: { 
    type: Date, 
    required: true 
  },
  used_by: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
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
couponSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
