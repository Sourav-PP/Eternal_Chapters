const mongoose = require('mongoose');
const { Schema } = mongoose


const offerSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    offer_type: {
      type: String,
      required: true,
      enum: ['product', 'category', 'referral']
    },
    discount_type: {
      type: Number,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    discount_value: {
      type: Number,
      required: true,
      min: 0,
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    related_products: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product'
      }
    ],
    related_categories: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category'
      }
    ],
  },
  { timestamps: true }
);


// Create the Offer model
const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;



// const offerSchema = new Schema({
//   offer_type: {
//     type: String,
//     required: true,
//     enum: ['product', 'category', 'referral'],
//   },
//   name: {
//     type: String,
//     required: true,
//   },
//   discount_type: {
//     type: String,
//     required: true,
//     enum: ['percentage', 'fixed'],
//   },
//   discount_value: {
//     type: Number,
//     required: true,
//     min: 0,
//   },
//   product_ids: {
//     type: [mongoose.Schema.Types.ObjectId],
//     ref: 'Product', // Reference to Product model
//   },
//   category_id: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Category', // Reference to Category model
//   },
//   referral_reward: {
//     type: {
//       reward_type: { type: String, enum: ['credit', 'discount'] },
//       reward_value: { type: Number, min: 0 },
//     },
//   },
//   description: {
//     type: String,
//   },
//   start_date: {
//     type: Date,
//   },
//   end_date: {
//     type: Date,
//   },
//   status: {
//     type: String,
//     enum: ['active', 'inactive'],
//   },
//   terms_and_conditions: {
//     type: String,
//   },
//   created_at: {
//     type: Date,
//     default: Date.now,
//   },
//   updated_at: {
//     type: Date,
//     default: Date.now,
//   },
// });

// // Middleware to update `updated_at` before saving
// offerSchema.pre('save', function (next) {
//   this.updated_at = Date.now();
//   next();
// });

// // Virtual field for discount percentage
// offerSchema.virtual('discount_percentage').get(function () {
//   if (this.discount_type === 'percentage') {
//     return this.discount_value;
//   }
//   return null;
// });

// // Create the Offer model
// const Offer = mongoose.model('Offer', offerSchema);

// module.exports = Offer;
