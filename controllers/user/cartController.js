const Cart = require('../../models/cartSchema')
const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')

//add to cart
const addToCart = async (req, res) => {
    try {
        const user_id = req.session.user
        const { quantity, product_id } = req.body

        const product = await Product.findById(product_id)

        if(product.available_quantity < 1 || product.status !== 'active') {
            req.flash('error', `the product ${product.title} is currently unavailable`);
            return res.redirect(`/productDetails?id=${product_id}`);
        }
        // Convert quantity to a number
        const parsedQuantity = Number(quantity) || 1;
        
        let currentQuantity = 0;

        let cart = await Cart.findOne({ user_id })
        if(cart) {
            const item = cart.items.find(item => item.product_id.toString() === product_id)
            if(item){
                currentQuantity = item.quantity;
            }
        }

        const totalQuantity = currentQuantity + parsedQuantity;

        if(totalQuantity > product.available_quantity) {
            req.flash('error', `Only ${product.available_quantity} items left in stock for ${product.title}!  You have already added ${currentQuantity} items to the cart`);
            return res.redirect(`/productDetails?id=${product_id}`);
        }


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
                success: req.flash('success'),
                error: req.flash('error')
            })
        }

        //calculate the total price
        let totalPrice = 0;
        const cartItems = cart.items.map(item => {
            const product = item.product_id;
            const shippingCharges = 100;
            const subTotal = (product.price * item.quantity) + shippingCharges;
            
            totalPrice += subTotal;
            return {
                product,
                quantity: item.quantity,
                subTotal,
            }
        })

        console.log('cartItems', cartItems)

        res.render('cart', {
            shippingCharges: 100,
            items: cartItems,
            totalPrice,
            success: req.flash('success'),
            error: req.flash('error')
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

//update cart item quantity
const updateCart = async(req,res) => {
    try {
        console.log('invoked')
        const {product_id, quantity} = req.body
        const userId = req.session.user
        console.log('quantity', quantity)

        const product = await Product.findById(product_id)

        if(product.available_quantity < quantity) {
            console.log('Redirecting to /cart-page');
            return res.status(400).json({
                success: false,
                message: `Only ${product.available_quantity} items available`
            })
        }

        const cart = await Cart.findOne({user_id: userId})

        //update the quantity for the specific product
        const item = cart.items.find(item => item.product_id.toString() === product_id)
        if(item) {
            item.quantity = quantity
        } else {
            req.flash('error', 'Product not found in the cart');
            return res.redirect('/cart-page');
        }

        await cart.save()
        req.flash('success', 'Cart updated successfully');
    } catch (error) {   
        console.error('error updating the cart', error)
    }
}




module.exports = {
    getCartPage,
    addToCart,
    removeProduct,
    updateCart,
}