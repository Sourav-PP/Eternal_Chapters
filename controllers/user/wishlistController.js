const Wishlist = require('../../models/wishlistSchema')
const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const mongoose = require('mongoose')

const getWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const wishlist = await Wishlist.findOne({ user_id: userId });

        if (!wishlist) {
            return res.render('wishlist', {
                wishlist: [],
                success: req.flash('success'),
                error: req.flash('error'),
            });
        }

        // Extract product IDs from wishlist
        const productIds = wishlist.products.map((item) => item.product_id);

        // Fetch product details
        const products = await Product.find(
            { _id: { $in: productIds } },
            'title product_imgs price offer_id category_id'
        )
        .populate('offer_id', 'discount_value status start_date end_date')
        .populate({
            path: 'category_id',
            populate: { path: 'offer_id', select: 'discount_value status start_date end_date' }
        });

        // Add offer-related details for each product
        const enrichedProducts = products.map((product) => {
            let offerDiscount = 0;
            let discountedPrice = product.price;

            if (product.offer_id && product.offer_id.status === 'active') {
                const now = new Date();
                const { start_date, end_date, discount_value } = product.offer_id;

                // Check if the offer is valid for the current date
                if (now >= new Date(start_date) && now <= new Date(end_date)) {
                    offerDiscount = (product.price * discount_value) / 100;
                    discountedPrice = product.price - offerDiscount;
                }
            }

            // Check for category-level offer if no valid product-level offer exists
            if ((!product.offer_id || product.offer_id.status !== 'active') && product.category_id && product.category_id.offer_id) {
                const categoryOffer = product.category_id.offer_id;

                if (categoryOffer.status === 'active') {
                    const now = new Date();
                    const { start_date, end_date, discount_value } = categoryOffer;

                    // Check if the category offer is valid for the current date
                    if (now >= new Date(start_date) && now <= new Date(end_date)) {
                        const categoryDiscount = (product.price * discount_value) / 100;

                        // Apply the higher discount between product and category-level offers
                        if (categoryDiscount > offerDiscount) {
                            offerDiscount = categoryDiscount;
                            discountedPrice = product.price - categoryDiscount;
                        }
                    }
                }
            }

            return {
                ...product.toObject(),
                offerDiscount: offerDiscount.toFixed(2),
                discountedPrice: discountedPrice.toFixed(2),
                originalPrice: product.price,
            };
        });

        // Render the wishlist page with enriched product details
        return res.render('wishlist', {
            wishlist: enrichedProducts,
            success: req.flash('success'),
            error: req.flash('error'),
        });
    } catch (error) {
        console.log('Error getting wishlist page:', error);
    }
};


const wishlist = async(req,res) => {
    try {
        const userId = req.session.user
        const { productId } = req.body

        // const productObjectId = new mongoose.Types.ObjectId(productId);
        let wishlist = await Wishlist.findOne({user_id: userId})

        if(!wishlist) {
            wishlist = new Wishlist({
                user_id: userId,
                products: [
                    {product_id : productId}
                ]
            })
            await wishlist.save()
            return res.status(201).json({message:'Product added to wishlist', listed: true})
        }

        //check if the product is already in the wishlist
        const productIndex = wishlist.products.findIndex((item) => item.product_id.toString() === productId)  
        
        if(productIndex >= 0) {
            wishlist.products.splice(productIndex, 1)
            await wishlist.save();
            return res.status(200).json({message: 'Product removed from the wishlist', listed: false})
        } else {
            wishlist.products.push({product_id : productId})
            await wishlist.save()
            return res.status(201).json({message:'Product added to wishlist', listed: true})
        }
    } catch (error) {
        console.log('error adding to wishlist', error)
    }
}

//remove product from wishlist
const remove = async(req,res) => {
    try {
        const productId = req.params.id
        const userId = req.session.user

        await Wishlist.updateOne(
            {user_id: userId},
            {$pull: {products:{product_id: productId}}}
        )

        req.flash('success','item removed from wishlist')
        return res.redirect('/wishlist')
    } catch (error) {
        console.log('error removing the product from wishlist', error)
    }
}

module.exports = {
    getWishlist,
    wishlist,
    remove
}