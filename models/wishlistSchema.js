const mongoose = require('mongoose');
const { Schema } = mongoose


const wishlistSchema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  products: [
    {
      product_id: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      addedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Middleware to update `updated_at` before saving
wishlistSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

// Add an index for performance
wishlistSchema.index({ user_id: 1 });

// Create the Wishlist model
const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist;
