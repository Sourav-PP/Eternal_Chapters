const mongoose = require('mongoose')
const {Schema} = mongoose

const categorySchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    description: {
        type: String,
        required: true,
    },
    offer_id: {
        type: Schema.Types.ObjectId,
        ref:"Offer",
        required:false,
    },
    is_deleted: {
        type: Boolean,
        default: false
    }
})

const Category = mongoose.model('Category', categorySchema)

module.exports = Category