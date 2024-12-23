const mongoose = require('mongoose');
const {Schema} = mongoose

const addressSchema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Reference to the User collection
    required: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    required: true,
    trim: true,
  },
  pin_code: {
    type: Number,
    required: true,
  },
  address_type: {
    type: String,
    enum: ['home', 'work'], // Valid values for address type
    required: true,
  },
  land_mark: {
    type: String,
    trim: true,
  },
  mobile_number: {
    type: String,
    required: true,
  },
  alternate_number: {
    type: String,
  },
  created_at: {
    type: Date,
    default: Date.now, // Automatically sets the creation timestamp
  },
  updated_at: {
    type: Date,
    default: Date.now, // Automatically sets the update timestamp
  },
});

// Middleware to update the `updated_at` field before saving
addressSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

const Address = mongoose.model('Address', addressSchema);

module.exports = Address;
