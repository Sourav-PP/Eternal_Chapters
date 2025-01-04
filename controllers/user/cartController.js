const Cart = require('../../models/cartSchema')
const User = require('../../models/userSchema')


const addToCart = async(req,res) => {
    try {
        const productId = req.params.id
    } catch (error) {
        console.error("error adding product to cart",error)
    }
}

const getCartPage = async(req,res) => {
    try {
        const userId = req.session.user

        const user = await User.findById(userId)
        res.render('cart',{
            user,
        })
    } catch (error) {
        console.error("error loading the cart page", error)
    }
}



module.exports = {
    getCartPage,
    addToCart,
}