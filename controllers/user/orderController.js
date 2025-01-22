const Order = require('../../models/orderSchema');
const OrderItems = require('../../models/orderItemsSchema');
const Address = require('../../models/addressSchema');
const Payment = require('../../models/paymentSchema');
const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema')
const Razorpay = require('razorpay');
const Transaction = require('../../models/transactionSchema');
const Coupon = require('../../models/couponSchema');
const Wallet = require('../../models/walletSchema');
const WalletTransaction = require('../../models/walletTransactionSchema');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

//get the checkout page
const checkout = async (req, res) => {
    try {
        const productId = req.query.productId
        console.log('productId checkout', productId)
        const userId = req.session.user
        const user = await User.findById(userId)
        const addresses = await Address.find({ user_id: userId })
        // const Prodects = await Product.findOne({ _id: productId })

        if (productId) {
            const product = await Product.findById(productId)
        } else {
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
                user,
                shippingCharges,
                error: req.flash('error'),
                success: req.flash('success')
            })
        }
    } catch (error) {
        console.log("error loading the checkout page", error)
    }
}

//apply coupon code
const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.session.user

        const coupon = await Coupon.findOne({ code: couponCode })
        if (!coupon) {
            return res.json({ success: false, message: 'Invalid coupon code.' });
        }

        if (new Date() > new Date(coupon.expiry_date)) {
            return res.json({ success: false, message: 'Coupon has expired.' });
        }

        //retrieve cart
        const cart = await Cart.findOne({ user_id: userId })
        if (!cart) {
            return res.json({ success: false, message: 'Your cart is empty.' });
        }

        //fetch all product ids
        const productIds = cart.items.map(item => item.product_id)

        const products = await Product.find({ '_id': { $in: productIds } })
        //total cart amount
        const totalAmount = cart.items.reduce((total, item) => {
            const product = products.find(p => p._id.toString() === item.product_id.toString())
            return total + (product ? product.price * item.quantity : 0)
        }, 0)

        let discountAmount = 0
        if (coupon.coupon_type === 'percentage') {
            discountAmount = (totalAmount * coupon.discount_value) / 100
        } else if (coupon.coupon_type === 'fixed') {
            discountAmount = coupon.discount_value
        }

        const shippingCharge = 100
        const newTotalAmount = totalAmount - discountAmount + shippingCharge;

        req.session.coupon = {
            code: couponCode,
            discountAmount,
            newTotalAmount
        }

        res.json({ success: true, discountAmount, newTotalAmount });
    } catch (error) {
        console.log('error applying coupon', error)
        res.json({ success: false, message: 'An error occurred. Please try again.' });
    }
}

//remove coupon
const removeCoupon = async(req,res) => {
    try {
        delete req.session.coupon;
        const userId = req.session.user

        //retrieve cart
        const cart = await Cart.findOne({ user_id: userId })
        if (!cart) {
            return res.json({ success: false, message: 'Your cart is empty.' });
        }

        //fetch all product ids
        const productIds = cart.items.map(item => item.product_id)

        const products = await Product.find({ '_id': { $in: productIds } })
        //total cart amount
        const totalAmount = cart.items.reduce((total, item) => {
            const product = products.find(p => p._id.toString() === item.product_id.toString())
            return total + (product ? product.price * item.quantity : 0)
        }, 0)

        const shippingCharge = 100
        const newTotalAmount = totalAmount + shippingCharge;

        return res.status(200).json({success: true, newTotalAmount})

    } catch (error) {
        console.log('error removing the coupon',error)
    }
}

//place order
const placeOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod, productId, razorpayPaymentId } = req.body;
        const userId = req.session.user;

        console.log('placeOrder invoked....')
        console.log('payment method is', paymentMethod)
        console.log('payment id is', razorpayPaymentId);

        if (!addressId || !paymentMethod) {
            req.flash('error', 'Please select address and payment method');
            return res.redirect(`/checkout`);
        }

        // For COD, don't need to save payment details
        let payment_id = null;
        let transactionStatus = 'pending';
        let razorpayOrderId = null;

        // Retrieve cart details
        const cart = await Cart.findOne({ user_id: userId }).populate("items.product_id");
        if (!cart || cart.items.length === 0) {
            req.flash('error', 'Your cart is empty.');
            return res.redirect('/cart-page');
        }

        // Check product availability
        for (const item of cart.items) {
            if (item.product_id.available_quantity < item.quantity) {
                req.flash('error', `Only ${item.product_id.available_quantity} left in stock for ${item.product_id.title}.`);
                return res.redirect('/cart-page');
            }
        }

        // Calculate total amount and charges
        const totalAmount = cart.items.reduce((total, item) => total + item.product_id.price * item.quantity, 0);
        const shippingCharges = 100;
        let discount = 0;
        let netAmount = totalAmount + shippingCharges;
        console.log('dfdfdnnnnn', netAmount)

        // Apply coupon if available
        if (req.session.coupon) {
            console.log('coupon is there')
            discount = req.session.coupon.discountAmount;
            netAmount -= discount;
        }

        console.log('netttttttttt', netAmount)

        //handle online payments
        let payment = null;
        if (paymentMethod !== 'COD') {
            if (!razorpayPaymentId) {
                req.flash('error', 'Payment ID is required for online payments');
                return res.redirect('/checkout');
            }

            // Create payment document
            payment = new Payment({
                user_id: userId,
                status: 'pending',
                payment_method: paymentMethod,
                razorpay_payment_id: razorpayPaymentId,
            });

            const savedPayment = await payment.save();

            // Create Razorpay order
            const razorpayOrder = await razorpay.orders.create({
                amount: netAmount * 100, // Razorpay expects the amount in paise
                currency: 'INR',
                receipt: `order_${savedPayment._id}`,
            });

            console.log('razorpay order:  ', razorpayOrder)

            razorpayOrderId = razorpayOrder.id;
            savedPayment.razorpay_order_id = razorpayOrderId;
            await savedPayment.save();
            payment_id = savedPayment._id;
        }

        // Create new order
        const newOrder = new Order({
            user_id: userId,
            payment_id: payment_id,
            payment_method: paymentMethod,
            address_id: addressId,
            shipping_chrg: shippingCharges,
            total: totalAmount,
            netAmount,
            discount,
        });

        const savedOrder = await newOrder.save();

        // Create order items
        const orderItems = new OrderItems({
            order_id: savedOrder._id,
            items: cart.items.map((item) => ({
                product_id: item.product_id._id,
                quantity: item.quantity,
                total_amount: item.product_id.price * item.quantity,
            })),
        });

        await orderItems.save();

        // Update product quantities
        for (let item of cart.items) {
            const product = item.product_id;
            const newQuantity = product.available_quantity - item.quantity;

            if (newQuantity >= 0) {
                await Product.findByIdAndUpdate(product._id, { available_quantity: newQuantity });
            } else {
                req.flash('error', `Not enough stock for ${product.title}.`);
                return res.redirect('/cart-page');
            }
        }

        // Create transaction
        const newTransaction = new Transaction({
            status: transactionStatus,
            amount: netAmount,
            payment_id: payment_id,
        });
        await newTransaction.save();

        // Clear the cart
        await Cart.findOneAndDelete({ user_id: userId });

        // Clear the coupon from session after order is placed
        delete req.session.coupon;

        req.flash('success', 'Order placed successfully.');
        return res.redirect('/success-page');

    } catch (error) {
        console.log("error placing the order", error);
        req.flash('error', 'Error placing the order');
        return res.redirect('/checkout');
    }
};

//get successpage
const success = async (req, res) => {
    try {
        return res.render('successPage', {
            success: req.flash('success')
        })
    } catch (error) {
        console.log("error loading the success page", error)
    }
}

//list order history
const orderHistory = async (req, res) => {
    try {
        const userId = req.session.user
        const orders = await Order.find({ user_id: userId }).sort({ created_at: -1 }).populate('address_id')

        for (const order of orders) {
            const orderItems = await OrderItems.find({ order_id: order._id }).populate('items.product_id')
            order.orderItems = orderItems
        }

        const getBadgeClass = (status) => {
            const classes = {
                delivered: 'bg-success',
                pending: 'bg-warning',
                shipped: 'bg-primary',
                canceled: 'bg-danger',
                return_requested: 'bg-info',
                return_approved: 'bg-success',
                return_rejected: 'bg-secondary',
            }
            return classes[status] || 'bg-dark';
        }

        res.render('orderHistory', {
            orders,
            getBadgeClass,
        })
    } catch (error) {
        console.log("error loading order history", error)
    }
}

//cancel order
const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.id
        const productId = req.params.productId
        const { cancelReason } = req.body

        const order = await Order.findById(orderId)
        if (!order) {
            return res.status(400).json({ success: false, message: 'order is not found' })
        }

        const orderItems = await OrderItems.findOne({ order_id: orderId })
        if (!orderItems) {
            return res.json({ success: false, message: 'Order not found' })
        }

        const item = orderItems.items.find(item => item.product_id.toString() === productId)
        if (!item) {
            return res.status(400).json({ success: false, message: 'Product not found' })
        }

        if (item.status === 'canceled') {
            return res.status(400).json({ success: false, message: 'Product already cancelled' });
        }

        //update the status of the item
        item.status = 'canceled'
        item.cancel_reason = cancelReason
        await orderItems.save()

        //update the product quantity after the cancelation
        await Product.findByIdAndUpdate(productId, {
            $inc: { available_quantity: item.quantity },
        });

        //calculate the refund amound for the product
        const refundAmount = item.total_amount;

        //handle payment refund nof onlne payments
        if (order.payment_method != "COD") {
            const payment = await Payment.findById(order.payment_id)

            //update payment status
            if (payment) {
                if (payment.status !== 'refunded') {
                    payment.refunded_amount = (payment.refunded_amount || 0) + refundAmount
                    payment.status = payment.refunded_amount == order.netAmount ? 'refunded' : 'partially_refunded'
                    await payment.save()
                }

                //update transaction status
                const transaction = await Transaction.findOne({ payment_id: payment._id })
                if (transaction) {
                    transaction.refunded_amount = (transaction.refunded_amount || 0) + refundAmount
                    transaction.status = payment.status
                    await transaction.save()
                }

                //initiate razpory refund
                if (payment.razorpay_payment_id) {
                    try {
                        const razorpayRefund = await razorpay.payments.refund(payment.razorpay_payment_id, {
                            amount: refundAmount * 100, // Amount in paise
                        });
                        console.log('Razorpay partial refund:', razorpayRefund);
                    } catch (razorpayError) {
                        console.error('Razorpay refund error:', razorpayError);
                        return res.status(500).json({
                            success: false,
                            message: 'Failed to process Razorpay refund. Please try again later.',
                        });
                    }

                }
            } else {
                console.error('Payment record not found for order:', orderId);
            }
            //update the wallet
            const user = await User.findById(order.user_id)
            const wallet = await Wallet.findOne({ user_id: user._id })

            if (wallet) {
                wallet.balance += refundAmount
                await wallet.save()


                //update the transaction of wallet
                const walletTransaction = new WalletTransaction({
                    wallet_id: wallet._id,
                    amount: refundAmount,
                    order_id: orderId,
                    transaction_type: 'refund',
                    balance_after_transaction: wallet.balance,
                    payment_status: 'successful',
                    razorpay_payment_id: payment.razorpay_payment_id || null,
                    razorpay_signature: payment.razorpay_signature || null,
                })

                await walletTransaction.save()
            }

        }



        res.json({ success: true, message: 'Order cancelled successfully' })
    } catch (error) {
        console.log("error cancelling the order", error)
    }
}

//return product
const returnOrder = async (req, res) => {
    try {
        const orderId = req.params.id
        const productId = req.params.productId
        const { returnReason } = req.body;

        if (!returnReason) {
            return res.status(400).json({ success: false, message: 'Return reason is required' })
        }

        const order = await Order.findById(orderId)
        if (!order) {
            return res.status(400).json({ success: false, message: 'order is not found' })
        }

        const orderItems = await OrderItems.findOne({ order_id: orderId })
        if (!orderItems) {
            return res.json({ success: false, message: 'Order is not found' })
        }

        const item = orderItems.items.find(item => item.product_id.toString() === productId)

        if (!item) {
            return res.status(400).json({ success: false, message: 'Product not found' })
        }

        if (item.status === 'return_requested' || item.status === 'returned') {
            return res.status(400).json({ success: false, message: 'Product already returned or requested' });
        }

        item.status = 'return_requested';
        item.return_reason = returnReason;
        await orderItems.save()

        res.status(200).json({ success: true, message: 'Return request sent successfully' })

    } catch (error) {
        console.log('error returning product', error)
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

module.exports = {
    checkout,
    placeOrder,
    orderHistory,
    cancelOrder,
    success,
    returnOrder,
    applyCoupon,
    removeCoupon,
}