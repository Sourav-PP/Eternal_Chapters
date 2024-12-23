const mongoose = require('mongoose');
const {Schema} = mongoose

const reviewSchema = new Schema({
  product_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  user_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
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
reviewSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

// Create the Review model
const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
