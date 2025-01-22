const mongoose = require('mongoose');
const {Schema} = mongoose

const walletTransactionSchema = new Schema({
  wallet_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Wallet', 
    required: true 
  },
  amount: {
    type: Number, 
    required: true 
  },
  order_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Order', 
    required: false 
  },
  transaction_type: {
    type: String,
    enum: ['creditCard', 'bank', 'upi', 'razorpay', 'refund'],
    required: true
  },
  balance_after_transaction: {
    type: Number,
    required: true
  },
  payment_status: {
    type: String,
    enum: ['initiated', 'successful', 'failed'],
    default: 'initiated', // Track transaction status
    required: true
  },
  razorpay_payment_id: {
    type: String, // Razorpay's payment ID for successful transactions
    required: false
  },
  razorpay_signature: {
    type: String, // Signature for transaction verification
    required: false
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
});

// Create the WalletTransaction model
const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);

module.exports = WalletTransaction;
