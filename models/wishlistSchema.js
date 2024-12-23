const mongoose = require('mongoose');
const {Schema} = mongoose


const wishlistSchema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true    
  },
  product_ids: [{
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true    
  }], // Array of Product references
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
wishlistSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

// Create the Wishlist model
const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist;
