const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')
const Review = require('../../models/reviewSchema')


//product detailed page
const getProductDetails = async(req,res) => {
    try {
        const userId = req.session.user
        const userData = await User.findById(userId)
        const productId = req.query.id
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
            review : reviews,
            relatedProducts: relatedProducts,
            stockState: stockState,
        })
    } catch (error) {
        console.error("error loading the product detail page:", error)
    }
}


module.exports = {
    getProductDetails
}