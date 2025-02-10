const User = require('../../models/userSchema')
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const Banner = require('../../models/bannerSchema')
const Cart = require('../../models/cartSchema')
const Offer = require('../../models/offerSchema')
const { v4: uuidv4 } = require('uuid');


const categoryPage = async (req, res) => {
    const requestId = uuidv4();
    try {
        const categoryName = req.params.id;
        const name = categoryName.toLowerCase();

        // Ensure the asynchronous operations are awaited properly
        const banner = await Banner.findOne({ name: categoryName });
        const category = await Category.findOne({ name: name });

        if (!category) {
            req.flash('error', 'Category not found');
            return res.redirect('/'); // Immediate return after redirection
        }

        if (category.is_deleted) {
            req.flash('error', 'This category is not available');
            return res.redirect('/'); // Immediate return after redirection
        }

        const offerCategory = await Offer.findById(category.offer_id);

        // Extract query parameters
        const { price, author, stock_state, sort, page } = req.query;

        const currentPage = parseInt(page) || 1;
        const itemsPerPage = 12;
        const skip = (currentPage - 1) * itemsPerPage;

        const query = { category_id: category._id, is_deleted: false };

        // Filter by price
        if (price) {
            const priceParts = price.split("-");
            if (priceParts.length === 2) {
                const [min, max] = priceParts.map(Number);
                if (!isNaN(min) && !isNaN(max)) {
                    query.price = { $gte: min, $lte: max };
                }
            } else if (priceParts.length === 1) {
                const min = Number(priceParts[0].replace("+", "").trim());
                if (!isNaN(min) && price.endsWith("+")) {
                    query.price = { $gte: min };
                }
            }
        }

        // Filter by author
        if (author) {
            query.author_name = new RegExp(author, "i");
        }

        // Apply filters and pagination
        let products = await Product.find(query)
            .populate('offer_id')
            .populate({ path: 'category_id', populate: { path: 'offer_id' } })
            .skip(skip)
            .limit(itemsPerPage);

        // Sort products
        if (sort === "asc") {
            products = products.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
        } else if (sort === "desc") {
            products = products.sort((a, b) => b.title.toLowerCase().localeCompare(a.title.toLowerCase()));
        }

        // Apply stock state filter in the application logic
        if (stock_state) {
            const stockStates = Array.isArray(stock_state) ? stock_state : [stock_state];
            products = products.filter(product => stockStates.includes(product.stock_state));
        }

        // Apply offer logic
        products = products.map(product => {
            let offerDiscount = 0;
            let discountedPrice = product.price;

            if (product.offer_id && product.offer_id.status === 'active' &&
                (!product.offer_id.end_date || new Date(product.offer_id.end_date) > new Date())) {
                offerDiscount = (product.price * product.offer_id.discount_value) / 100;
                discountedPrice = product.price - offerDiscount;
            }

            // Check category offer (if no product offer exists or if category offer is higher)
            if ((!product.offer_id || product.offer_id.status !== 'active') &&
                product.category_id && product.category_id.offer_id &&
                product.category_id.offer_id.status === 'active' &&
                (!product.category_id.offer_id.end_date || new Date(product.category_id.offer_id.end_date) > new Date())) {
                const categoryDiscount = (product.price * product.category_id.offer_id.discount_value) / 100;
                // Apply higher discount between product and category
                if (categoryDiscount > offerDiscount) {
                    offerDiscount = categoryDiscount;
                    discountedPrice = product.price - categoryDiscount;
                }
            }

            return {
                ...product.toObject(),
                offerDiscount,
                discountedPrice,
                originalPrice: product.price
            };
        });

        const totalCount = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalCount / itemsPerPage);

        // Check if there are products to display
        if (products.length === 0) {
            req.flash('error', 'No products found in this category');
        }

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.render("productListCategory", {
                products,
                totalPages,
                currentPage,
                title: categoryName.toUpperCase()
            });
        } else {
            return res.render('categoryPage', {
                products,
                name,
                offerCategory,
                banner,
                totalPages,
                currentPage,
                title: categoryName.toUpperCase()
            });
        }

    } catch (error) {
        console.log(`[${requestId}] Error loading the category page:`, error);
        req.flash('error', 'Server error');
        return res.redirect('/'); // Immediate return after redirection
    }
};

module.exports = {
    categoryPage,
}