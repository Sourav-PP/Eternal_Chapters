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
  created_at: { 
    type: Date, 
    default: Date.now 
  },
});

// Create the WalletTransaction model
const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);

module.exports = WalletTransaction;
