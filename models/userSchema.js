const mongoose = require('mongoose');
const {Schema} = mongoose

const userSchema = new Schema(
    {
        first_name: {
            type: String,
            required: true
        },
        last_name: {
            type: String,
            required: true
        },
        date_of_birth: {
            type: Date,
            required: false
    
        },
        phone_no: {
            type: String,
            required: false,
            unique: true,
            sparse: true,
            default: null,
        },
        email: {
            type: String,
            required: true,
            unique: true  //Ensures that no two users can register with the same email address
        },
        password: {
            type: String,
            required: true
        },
        is_blocked: {
            type: Boolean,
            default: false
        },
        google_id: {
            type: String,
            unique: true,
            sparse: true,
        },
        is_admin: {
            type: Boolean,
            default: false
        },
        created_at: {
            type: Date,
            default: Date.now
        },
        updated_at: {
            type: Date,
            default: Date.now
        },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt fields
    }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
