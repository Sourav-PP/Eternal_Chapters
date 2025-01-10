const Order = require('../../models/orderSchema');
const OrderItems = require('../../models/orderItemsSchema');
const Address = require('../../models/addressSchema');
const Payment = require('../../models/paymentSchema');
const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');
const { create } = require('../../models/userSchema');

//get the checkout page
const checkout = async (req, res) => {
    try {
        console.log("checkout page")
        const productId = req.query.productId
        const userId = req.session.user
        const addresses = await Address.find({ user_id: userId })
        // const Prodects = await Product.findOne({ _id: productId })

        if (productId) {
            console.log('hjhkkj')
            const product = await Product.findById(productId)
        } else {
            console.log('hoooo')
            const cart = await Cart.findOne({ user_id: userId }).populate('items.product_id')
            const shippingCharges = 100;
            const totalAmount = cart.items.reduce((total, item) => total + item.product_id.price * item.quantity, 0)
            const netAmount = totalAmount + shippingCharges
            const discount = totalAmount * 0;
            

            res.render('checkout', {
                addresses,
                cart,
                totalAmount,
                netAmount,
                discount,
                shippingCharges,
                error: req.flash('error')
            })
        }
    } catch (error) {
        console.log("error loading the checkout page", error)
    }
}

//place order
const placeOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod, productId } = req.body
        const userId = req.session.user

        if (!addressId && !paymentMethod) {
            req.flash('error', 'Please select address and payment method')
            return res.redirect(`/checkout`)
        }

        

        //for COD don't need to save payment details
        let payment_id = null;


        const cart = await Cart.findOne({ user_id: userId }).populate("items.product_id")

        for(const item of cart.items){
            if(item.product_id.available_quantity < item.quantity){
                req.flash('error', `Only ${item.product_id.available_quantity} left in stock for ${item.product_id.title}`)
                return res.redirect('/cart-page')
            }
        }

        console.log('cart in checkout', cart)
        console.log('cart items', cart.items)

        console.log(cart.items.length)

        if (!cart || cart.items.length === 0) {
            req.flash('error', 'Your cart is empty')
            return res.redirect(`/cart-page`)
        }

        //calculate total amount of shipping charge
        const totalAmount = cart.items.reduce((total, item) => total + item.product_id.price * item.quantity, 0)

        const discount = 0;
        const shippingCharges = 100;
        const netAmount = totalAmount + shippingCharges - discount

        //create new order
        const newOrder = new Order({
            user_id: userId,
            payment_id,
            payment_method: paymentMethod,
            address_id: addressId,
            shipping_chrg: shippingCharges,
            total: totalAmount,
            netAmount,
            discount,
        })

        const savedOrder = await newOrder.save()

        const orderItems = new OrderItems({
            order_id: savedOrder._id,
            items: cart.items.map((item) => ({
                product_id: item.product_id._id,
                quantity: item.quantity,
                total_amount: item.product_id.price * item.quantity,
            }))
        })

        await orderItems.save()

        // Decrease the available quantity for each product
        for (let item of cart.items) {
            const product = item.product_id;
            const newQuantity = product.available_quantity - item.quantity;

            // Ensure that available quantity doesn't go negative
            if (newQuantity >= 0) {
                await Product.findByIdAndUpdate(product._id, { available_quantity: newQuantity });
            } else {
                req.flash('error', `Not enough stock for ${product.title}.`)
                return res.redirect('/cart-page');
            }
        }

        //clear the cart after placing the order
        await Cart.findOneAndDelete({ user_id: userId })

        req.flash('success', 'Order placed successfully')
        return res.redirect('/cart-page')
    } catch (error) {
        console.log("error placing the order", error)
    }
}

//list order history
const orderHistory = async (req, res) => {
    try {
        const userId = req.session.user
        const orders = await Order.find({user_id: userId}).sort({createdAt: -1}).populate('address_id')
        console.log('orders', orders)

        for(const order of orders){
            const orderItems = await OrderItems.find({order_id: order._id}).populate('items.product_id')
            order.orderItems = orderItems
        }
        res.render('orderHistory', {
            orders,
        })
    }catch(error){
        console.log("error loading order history", error)
    }
}

//cancel order
const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.id
        
        await Order.findByIdAndUpdate(orderId, {status: 'cancelled'})
        
        const orderItems = await OrderItems.findOne({order_id: orderId})
        if(!orderItems) {
            return res.json({success: false, message: 'Order not found'})
        }

        for(const item of orderItems.items) {
            await Product.findByIdAndUpdate(item.product_id, {
                $inc: {available_quantity: item.quantity}
            })
        }

        res.json({success: true, message: 'Order cancelled successfully'})
    }catch(error){
        console.log("error cancelling the order", error)
    }
}

module.exports = {
    checkout,
    placeOrder,
    orderHistory,
    cancelOrder,
}