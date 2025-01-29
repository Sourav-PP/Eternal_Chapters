const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')
const Review = require('../../models/reviewSchema')
const Banner = require('../../models/bannerSchema')


//product detailed page
const getProductDetails = async (req, res) => {
    try {
        const userId = req.session.user
        const userData = await User.findById(userId)
        const productId = req.query.id

        if (!productId) {
            return res.status(400).send("Product ID is required");
        }

        const productData = await Product.findById(productId)
            .populate({
                path: "category_id",
                populate: {
                    path: "offer_id",
                },
            })
            .populate("offer_id");

        let offerDiscount = 0
        let discountedPrice = 0

        //check for prodect-level offer
        if(productData.offer_id && productData.offer_id.status === 'active' &&
            (!productData.offer_id.end_date || new Date(productData.offer_id.end_date) > new Date())) 
        {
            offerDiscount = (productData.price * productData.offer_id.discount_value) / 100
            discountedPrice = productData.price - offerDiscount
        }

        // Check for category-level offer
        if ((!productData.offer_id || productData.offer_id.status !== 'active') &&
            productData.category_id && productData.category_id.offer_id &&
            productData.category_id.offer_id.status === 'active' &&
            (!productData.category_id.offer_id.end_date || new Date(productData.category_id.offer_id.end_date) > new Date()))
        {
            const categoryDiscount = (productData.price * productData.category_id.offer_id.discount_value) / 100;

            // Apply the higher discount between product and category-level offers
            if (categoryDiscount > offerDiscount) {
                offerDiscount = categoryDiscount;
                discountedPrice = productData.price - categoryDiscount;
            }
        }

        offerDiscount = offerDiscount.toFixed(2)
        discountedPrice = discountedPrice.toFixed(2)

        const findCategory = productData.category_id;
        const stockState = productData.stock_state;

        //related products
        let relatedProducts = await Product.find({
            category_id: productData.category_id,
            _id: { $ne: productData._id },
            is_deleted: false 
        })
        .populate({
            path: "category_id",
            populate: {
                path: "offer_id",
            },
        })
        .populate("offer_id")
        .limit(4);

        // Calculate offer details for related products
        relatedProducts = relatedProducts.map(item => {
            let relatedOfferDiscount = 0
            let relatedDiscountedPrice = 0

            if(item.offer_id && item.offer_id.status === 'active' &&
                (!item.offer_id.end_date || new Date(item.offer_id.end_date) > new Date()))
            {
                relatedOfferDiscount = (item.price * item.offer_id.discount_value) / 100
                relatedDiscountedPrice = item.price - relatedOfferDiscount
            }

            // Check for category-level offer
            if ((!item.offer_id || item.offer_id.status !== 'active') && 
                item.category_id &&
                item.category_id.offer_id &&
                item.category_id.offer_id.status === 'active' &&
                (!item.category_id.offer_id.end_date || new Date(item.category_id.offer_id.end_date) > new Date()))
            {
                const categoryDiscount = (item.price * item.category_id.offer_id.discount_value) / 100;

                // Apply the higher discount between product and category-level offers
                if (categoryDiscount > relatedOfferDiscount) {
                    relatedOfferDiscount = categoryDiscount;
                    relatedDiscountedPrice = item.price - categoryDiscount;
                }
            }
            
            return {
                ...item.toObject(),
                relatedOfferDiscount: relatedOfferDiscount.toFixed(2),
                relatedDiscountedPrice: relatedDiscountedPrice.toFixed(2),
                originalPrice: item.price
            }
        })

        const reviews = await Review.find({ product_id: productId })

        const formattedDate = new Date(productData.publishing_date).toLocaleDateString("en-GB"); // Format: DD-MM-YYYY
        productData.formattedDate = formattedDate;


        res.render("product_details", {
            user: userData,
            product: productData,
            offerDiscount: offerDiscount,
            discountedPrice: discountedPrice,
            originalPrice: productData.price,
            category: findCategory,
            review: reviews,
            relatedProducts,
            stockState: stockState,
            success: req.flash('success'),
            error: req.flash('error')
        })
    } catch (error) {
        console.error("error loading the product detail page:", error)
    }
}

//filter product
const filterProduct = async (req, res) => {
    try {
        const { price, author, stock_state, sort } = req.query
        const banners = await Banner.find({ name: "Romance" });

        const query = {}

        //filter by price
        if (price) {
            const priceParts = price.split("-");

            if (priceParts.length === 2) {
                const [min, max] = priceParts.map(Number);
                if (!isNaN(min) && !isNaN(max)) {
                    query.price = { $gte: min, $lte: max };
                }
            } else if (priceParts.length === 1) {
                const min = Number(priceParts[0]);
                if (!isNaN(min) && price.endsWith("+")) {
                    query.price = { $gte: min };
                }
            }
        }

        //filter by author
        if (author) {
            query.author_name = new RegExp(author, "i");
        }

        let products = await Product.find(query);

        //filter by sort
        if (sort === "asc") {
            products = products.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
        } else if (sort === "desc") {
            products = products.sort((a, b) => b.title.toLowerCase().localeCompare(a.title.toLowerCase()));
        }   


        if (stock_state) {
            products = products.filter(product => product.stock_state === stock_state);
        }
        return res.render("romance", {
            products,
            banner: banners[0],
            name: "Romance",
        });


    } catch (error) {
        console.log('error filtering the products', error)
    }
}
module.exports = {
    getProductDetails,
    filterProduct,
}