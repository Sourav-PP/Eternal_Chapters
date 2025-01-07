const User = require('../../models/userSchema')
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const Banner = require('../../models/bannerSchema')
const Cart = require('../../models/cartSchema')


const romance = async(req,res) => {
    try {
        const categoryName = req.params.id
        const name = categoryName.toUpperCase()
        const banner = await Banner.findOne({name:'Romance'})
        const category = await Category.findOne({name: categoryName})
    
        if(!category) {
            req.flash('error', 'category not found')
            return res.redirect('/')
        }
        const products = await Product.find({category_id: category._id})

        // Check if there are products to display
        if (products.length === 0) {
            req.flash('error', 'No products found in this category');
        }

        const updatedProducts = products.map(product => ({
            ...product._doc,
            title: product.title
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
        }));

        return res.render('romance', {
            products: updatedProducts,
            name,
            banner,
        })
    } catch (error) {
        console.log('error loading the romance page',error)
        req.flash('error', 'server error')
        res.redirect('/')
    }
}

module.exports = {
    romance,
}