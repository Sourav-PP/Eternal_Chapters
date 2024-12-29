const mongoose = require('mongoose')
const { Schema } = mongoose

const productSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    category_id: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true,
    },
    author_name: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    available_quantity: {
        type: Number,
        default: 0,
    },
    description: {
        type: String,
        required: true,
    },
    publishing_date: {
        type: Date,
        required: false,
    },
    publisher: {
        type: String,
        required: true,
    },
    page: {
        type: Number,
        required: true,
    },
    language: {
        type: String,
        required: true,
    },
    product_imgs: {
        type: [String],
        required: true,
    },
    status: {
        type: String,
        enum: ["Available", "Out of stock", "Unavailable"],
        required: true,
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }

})

productSchema.pre('save', function (next) {
    this.updated_at = Date.now();
    next();
});

const Product = mongoose.model('Product', productSchema)

module.exports = Product