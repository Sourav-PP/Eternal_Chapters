const mongoose = require('mongoose');
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
  }, // Unique coupon code
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
  description: { 
    type: String, 
    trim: true 
  }, // Optional description
  limit: { 
    type: Number, 
    required: true, 
    min: 1 
  }, // Maximum usage limit
  expiry_date: { 
    type: Date, 
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
couponSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

// Create the Coupon model
const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
