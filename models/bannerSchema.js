const mongoose = require('mongoose');
const {Schema} = mongoose

const bannerSchema = new Schema({
  name: { 
    type: String, 
    required: true 
  },
  banner_img: { 
    type: String, 
    required: true 
  },
  start_date: { 
    type: Date, 
    required: true 
  },
  end_date: { 
    type: Date, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive'], 
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
bannerSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

// Create the Banner model
const Banner = mongoose.model('Banner', bannerSchema);

module.exports = Banner;
