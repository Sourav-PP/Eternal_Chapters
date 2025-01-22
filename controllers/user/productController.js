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
        const productData = await Product.findById(productId).populate("category_id")
        const findCategory = productData.category_id;
        const stockState = productData.stock_state;

        //related products
        const relatedProducts = await Product.find({
            category_id: productData.category_id, // Use category_id for filtering
            _id: { $ne: productData._id },        // Exclude the current product
            is_deleted: false                 // Ensure the product is not marked as deleted
        }).limit(4); // Limit the number of related products


        const reviews = await Review.find({ product_id: productId })

        const formattedDate = new Date(productData.publishing_date).toLocaleDateString("en-GB"); // Format: DD-MM-YYYY
        productData.formattedDate = formattedDate;

        res.render("product_details", {
            user: userData,
            product: productData,
            category: findCategory,
            review: reviews,
            relatedProducts: relatedProducts,
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

//filter the home page
const filterHome = async(req,res) => {
    try {
        const { price, author, stock_state, sort, categoryName } = req.query;
        const bannerData = await Banner.find({ name: "Home Banner" }); 

        const query = {};

        // Filter by price
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

        // Filter by author
        if (author) {
            query.author_name = new RegExp(author, "i");
        }

        // Filter by category (if provided)
        const category = await Category.findOne({name: categoryName})
        if (category) {
            query.category_id = category._id;
        }

        let products = await Product.find(query);

        // Filter by sort
        if (sort === "asc") {
            products = products.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
        } else if (sort === "desc") {
            products = products.sort((a, b) => b.title.toLowerCase().localeCompare(a.title.toLowerCase()));
        }

        // Filter by stock state
        if (stock_state) {
            products = products.filter(product => product.stock_state === stock_state);
        }

        // Render homepage with filtered products
        return res.render("home", {
            products,
            banner: bannerData[0], 
            name: "Home",
            category,
        });
    } catch (error) {
        
    }
}

module.exports = {
    getProductDetails,
    filterProduct,
    filterHome,
}