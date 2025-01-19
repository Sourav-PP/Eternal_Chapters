const mongoose = require('mongoose');
const {Schema} = mongoose


const transactionSchema = new Schema({
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'canceled', 'partially_refunded', 'refunded'],
  },
  amount: {
    type: Number,
    required: true
  },
  refunded_amount: {
    type: Number,
    default: 0, // Initialize to 0
  },
  date: {
    type: Date,
    default: Date.now
  },
  payment_id: {
    type: Schema.Types.ObjectId,
    ref: 'Payment',
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
transactionSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

// Create the Transaction model
const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
