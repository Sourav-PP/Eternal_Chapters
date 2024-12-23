const mongoose = require('mongoose');
const {Schema} = mongoose

const walletSchema = new Schema({
  user_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  balance: { 
    type: Number, 
    required: true, 
    default: 0 
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
walletSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

// Create the Wallet model
const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;
