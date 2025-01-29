const mongoose = require('mongoose')
const { Schema } = mongoose

const productSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    offer_id: {
        type: Schema.Types.ObjectId,
        ref:"Offer",
        required:false,
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
        enum: ["active", "discontinued", "unavailable"],
        required: true,
        default: "active"
    },
    is_deleted: {
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
    }
})

productSchema.pre('save', function (next) {
    this.updated_at = Date.now();
    next();
});

productSchema.virtual("stock_state").get(function() {
    if(this.is_deleted) return "Blocked";
    if(this.available_quantity === 0) return this.status === "discontinued" ? "Sold out" : "Out of stock";
    if(this.status === "unavailable") return "Unavailable"
    return "Available"
})

productSchema.set('toObject', { virtuals: true });
productSchema.set('toJSON', { virtuals: true });

const Product = mongoose.model('Product', productSchema)

module.exports = Product
