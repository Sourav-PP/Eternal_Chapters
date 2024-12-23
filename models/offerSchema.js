const mongoose = require('mongoose');
const {Schema} = mongoose


const offerSchema = new Schema({
  product_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  discount_percentage: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 100 
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
offerSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

// Create the Offer model
const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;
