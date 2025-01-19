const mongoose = require('mongoose');
const { Schema } = mongoose

const orderItemsSchema = new Schema({
  order_id: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  }, // Reference to the associated order
  items: [
    {
      product_id: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: {
        type: Number,
        required: true
      },
      total_amount: {
        type: Number,
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'shipped', 'delivered', 'canceled', 'return_requested', 'return_approved', 'return_rejected'],
        default: 'pending'
      },
      return_reason: {
        type: String,
        default: ''
      },
      cancel_reason: {
        type: String,
        default: ''
      }
    }
  ],
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
orderItemsSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

// Create the OrderItems model
const OrderItems = mongoose.model('OrderItems', orderItemsSchema);

module.exports = OrderItems;
