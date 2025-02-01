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
        const cart = await Cart.findOne({ user_id: userId })
            .populate({
                path: 'items.product_id',
                populate: [
                    {
                        path: 'offer_id', // Populate the product's offer
                        match: { _id: { $ne: null } },
                    },
                    {
                        path: 'category_id', // Populate the category
                        populate: {
                            path: 'offer_id', // Populate the category's offer
                            match: { _id: { $ne: null } },
                        },
                    },
                ],
            }); 

        if(!cart) {
            return res.render('cart',{
                items: [],
                totalPrice: 0,
                taxAmount: 0,
                shippingCharges: 0,
                offerDiscount: 0,
                netAmount: 0,
                numberOfItems: 0,
                originalPrice: 0,
                success: req.flash('success'),
                error: req.flash('error')
            })
        }

        let originalPrice = 0; //netAmount
        let totalOfferDiscount = 0
        let rawSubtotal = 0
        let offerDiscount = 0
        let netAmount = 0
        let taxAmount = 0
        let numberOfItems = 0

        const cartItems = cart.items.map(item => {
            const product = item.product_id;

            let productPrice = product.price
            let productOfferDiscount = 0
            let categoryOfferDiscount = 0

            // check for product level offer
            if(product.offer_id && product.offer_id.status === 'active' &&
                (!product.offer_id.end_date || new Date(product.offer_id.end_date) > new Date()))
            {
                productOfferDiscount = (productPrice * product.offer_id.discount_value) / 100
            }

            // check for category level offer
            if((!product.offer_id || product.offer_id.status !== 'active') &&
                product.category_id &&
                product.category_id.offer_id &&
                product.category_id.offer_id.status === 'active' &&
                (!product.category_id.offer_id.end_date || new Date(product.category_id.offer_id.end_date) > new Date()))
            {
                categoryOfferDiscount = (productPrice * product.category_id.offer_id.discount_value) / 100
            }

            // Apply the higher discount between product and category
            if (categoryOfferDiscount > productOfferDiscount) {
                productOfferDiscount = categoryOfferDiscount;
            }

            const discountedPrice = productPrice - productOfferDiscount;
            const subTotal = discountedPrice * item.quantity;
            rawSubtotal += subTotal
            totalOfferDiscount += productOfferDiscount * item.quantity
            originalPrice = productPrice * item.quantity
            numberOfItems += item.quantity

            return {
                product,
                quantity: item.quantity,
                discountedPrice,
                subTotal,
                OfferDiscount: productOfferDiscount * item.quantity
            }

            
        })

        // Add shipping charges to the total price
        const taxRate = 0.12;
        taxAmount = rawSubtotal * taxRate
        const shippingCharges = 100;
        const totalPrice = rawSubtotal + shippingCharges + taxAmount
        console.log('number of items',numberOfItems)

        res.render('cart', {
            shippingCharges,
            items: cartItems,
            totalPrice: totalPrice.toFixed(2),
            taxAmount,
            rawSubtotal: rawSubtotal.toFixed(2),
            numberOfItems,
            originalPrice,
            offerDiscount: totalOfferDiscount.toFixed(2),
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
        const {product_id, quantity} = req.body
        const userId = req.session.user

        const product = await Product.findById(product_id)

        if(product.available_quantity < quantity) {
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