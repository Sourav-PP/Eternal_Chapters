const Cart = require('../../models/cartSchema')
const User = require('../../models/userSchema')

//add to cart
const addToCart = async (req, res) => {
    try {
        const user_id = req.session.user
        const { quantity, product_id } = req.body

        // Convert quantity to a number
        const parsedQuantity = Number(quantity) || 1;

        let cart = await Cart.findOne({ user_id })
        if (!cart) {
            //create a new cart if it doesn't exist
            cart = new Cart({ user_id, items: [{ product_id, quantity: parsedQuantity || 1 }] })
        } else {
            //if the product is already exist
            const itemIndex = cart.items.findIndex(item => item.product_id.toString() === product_id)

            if (itemIndex > -1) {
                cart.items[itemIndex].quantity += parsedQuantity
            } else {
                //otherwise add the new product to the cart
                cart.items.push({ product_id, quantity: parsedQuantity })
            }
        }

        await cart.save();

        req.flash('success', 'Prodect has been added to the cart')
        res.redirect(`/productDetails?id=${product_id}`);
    } catch (error) {
        console.error("error adding product to cart", error)
    }
}

//get the cart page
const getCartPage = async (req, res) => {
    try {
        const userId = req.session.user
        const cart = await Cart.findOne({ user_id: userId }).populate('items.product_id')

        if(!cart) {
            return res.render('cart',{
                items: [],
                totalPrice: 0,
            })
        }

        //calculate the total price
        let totalPrice = 0;
        const cartItems = cart.items.map(item => {
            const product = item.product_id;
            const subTotal = product.price * item.quantity
            totalPrice += subTotal;
            return {
                product,
                quantity: item.quantity,
                subTotal
            }
        })

        console.log("items in cart",cartItems)

        res.render('cart', {
            items: cartItems,
            totalPrice,
            success: req.flash('success')
        })
    } catch (error) {
        console.error("error loading the cart page", error)
    }
}

//remove product from the cart
const removeProduct = async(req,res) => {
    try {
        const productId = req.params.id
        const userId = req.session.user

        await Cart.updateOne(
            {user_id: userId},
            {$pull: {items: {product_id: productId}}}
        )

        req.flash('success', 'Product removed from cart');
        res.redirect('/cart-page');

    } catch (error) {
        console.log('error removing the product from cart',error)
    }
}



module.exports = {
    getCartPage,
    addToCart,
    removeProduct,
}