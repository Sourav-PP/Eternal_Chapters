const mongoose = require('mongoose');
const {Schema} = mongoose

const contactUsSchema = new Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'] 
  },
  subject: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  status: { 
    type: String, 
    enum: ['new', 'in-progress', 'resolved'], 
    default: 'new' 
  },
});

// Create the ContactUs model
const ContactUs = mongoose.model('ContactUs', contactUsSchema);

module.exports = ContactUs;
