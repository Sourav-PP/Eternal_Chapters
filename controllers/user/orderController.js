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
const Offer = require('../../models/offerSchema');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

//get the checkout page
const checkout = async (req, res) => {
    try {
        const productId = req.query.productId
        const userId = req.session.user
        const coupons = await Coupon.find({is_active: 'active'})

        const user = await User.findById(userId)
        const addresses = await Address.find({ user_id: userId })
        const shippingCharge = 100
        const taxRate = 0.12;

        let cart = null
        let product = null
        let numberOfItems = 0
        let totalAmount = 0
        let originalPrice = 0
        let taxAmount = 0
        let offerPercentage = 0
        let offerDiscount = 0
        let couponDiscount = 0
        let netAmount = 0


        if (productId) {
            product = await Product.findById(productId).populate('offer_id').populate('category_id.offer_id')
        } else {
            cart = await Cart.findOne({ user_id: userId })
                .populate({
                    path: 'items.product_id',
                    populate: [
                        {
                            path: 'offer_id',
                            match: { _id: { $ne: null } }
                        },
                        {
                            path: 'category_id',
                            populate: {
                                path: 'offer_id',
                                match: { _id: { $ne: null } }
                            }
                        }
                    ]
                });

            if (!cart || cart.items.length <= 0) {
                req.flash('error', 'Your cart is empty!')
                return res.redirect('/cart-page')
            }

            //calculate the totlal amout for the all items in the cart
            totalAmount = cart.items.reduce((total, item) => {
                const product = item.product_id
                let productOfferDiscount = 0;
                let categoryOfferDiscount = 0;

                // Apply product-level offer if exists
                if (product.offer_id && product.offer_id.status === 'active' &&
                    (!product.offer_id.end_date || new Date(product.offer_id.end_date) > new Date()))
                {
                    offerPercentage = product.offer_id.discount_value
                    productOfferDiscount = (product.price * product.offer_id.discount_value) / 100
                }

                // Apply category-level offer if no product-level offer
                if ((!product.offer_id || product.offer_id.status !== 'active') &&
                    product.category_id &&
                    product.category_id.offer_id &&
                    product.category_id.offer_id.status === 'active' &&
                    (!product.category_id.offer_id.end_date || new Date(product.category_id.offer_id.end_date) > new Date()))
                {
                    categoryOfferDiscount = (product.price * product.category_id.offer_id.discount_value) / 100
                }

                numberOfItems += item.quantity
                originalPrice += product.price * item.quantity
                offerDiscount += (productOfferDiscount + categoryOfferDiscount) * item.quantity;

                return total + (product.price - productOfferDiscount - categoryOfferDiscount) * item.quantity;

            }, 0)
        }

        taxAmount = Math.round((totalAmount * taxRate) * 100) / 100;
        netAmount = (totalAmount + shippingCharge + taxAmount)
        let discount = offerDiscount + couponDiscount


        res.render('checkout', {
            addresses,
            cart,
            numberOfItems,
            originalPrice,
            taxAmount,
            offerDiscount,
            netAmount,
            discount,
            user,
            coupons,
            shippingCharge,
            error: req.flash('error'),
            success: req.flash('success')
        })
    } catch (error) {
        console.log("error loading the checkout page", error)
    }
}

//apply coupon code
const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.session.user

        //find the coupon
        const coupon = await Coupon.findOne({ code: couponCode })
        if (!coupon) {
            return res.json({ success: false, message: 'Invalid coupon code!' });
        }

        if (new Date() > new Date(coupon.expiry_date)) {
            return res.json({ success: false, message: 'Coupon has expired!' });
        }

        // check if the coupon is already used by the user
        if(coupon.used_by && coupon.used_by.includes(userId)) {
            return res.json({ success: false, message: 'You have already used this coupon!'})
        }

        //retrieve cart
        const cart = await Cart.findOne({ user_id: userId })
        if (!cart) {
            return res.json({ success: false, message: 'Your cart is empty!' });
        }

        //fetch all product ids
        const productIds = cart.items.map(item => item.product_id)
        const products = await Product.find({ '_id': { $in: productIds } })
            .populate('offer_id') // Populate product-level offer
            .populate({
                path: 'category_id',
                populate: {
                    path: 'offer_id' // Populate category-level offer
                }
            });
 
        const offers = await Offer.find({status: 'active'})

        let totalAmount = 0;
        let offerDiscount = 0
        let couponApplicableAmount = 0
        

        cart.items.forEach((item) => {
            const product = products.find(p => p._id.toString() === item.product_id.toString())
            if(!product) return

            const quantity = item.quantity
            let productPrice = product.price

            let productOfferDiscount = 0
            let categoryOfferDiscount = 0

            //apply product level offer
            if (product.offer_id && product.offer_id.status === 'active' &&
                (!product.offer_id.end_date || new Date(product.offer_id.end_date) > new Date())) {
                productOfferDiscount = (productPrice * product.offer_id.discount_value) / 100;
            }

            // Apply category-level offer if no product-level offer
            if ((!product.offer_id || product.offer_id.status !== 'active') &&
                product.category_id &&
                product.category_id.offer_id &&
                product.category_id.offer_id.status === 'active' &&
                (!product.category_id.offer_id.end_date || new Date(product.category_id.offer_id.end_date) > new Date())) {
                categoryOfferDiscount = (productPrice * product.category_id.offer_id.discount_value) / 100;
            }


            offerDiscount += (productOfferDiscount + categoryOfferDiscount) * quantity
            productPrice -= (productOfferDiscount + categoryOfferDiscount)

            //total amount after applying offer
            totalAmount += productPrice * quantity
            couponApplicableAmount += productPrice * quantity
        })

        let couponDiscount = 0
        let discountValue = 0
        if (coupon.coupon_type === 'percentage') {
            discountValue = coupon.discount_value
            couponDiscount = (couponApplicableAmount * coupon.discount_value) / 100
        } else if (coupon.coupon_type === 'fixed') {
            couponDiscount = coupon.discount_value
        }

        couponDiscount = Math.min(couponDiscount, couponApplicableAmount)

        //calculate the final amount 
        const shippingCharge = 100
        const taxRate = 0.12;
        const taxAmount = totalAmount * taxRate
        const newTotalAmount = totalAmount - couponDiscount + shippingCharge + taxAmount;
        const formattedTotalAmount = newTotalAmount.toFixed(2)

        req.session.coupon = {
            code: couponCode,
            couponDiscount,
            newTotalAmount
        }
      

        res.json({
            success: true,
            offerDiscount: offerDiscount.toFixed(2),
            couponDiscount: couponDiscount.toFixed(2),
            formattedTotalAmount,
            discountValue,
        });
    } catch (error) {
        console.log('error applying coupon', error)
        res.json({ success: false, message: 'An error occurred. Please try again.' });
    }
}

//remove coupon
const removeCoupon = async (req, res) => {
    try {
        const userId = req.session.user
        delete req.session.coupon;

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
        const taxRate = 0.12;
        const taxAmount = totalAmount * taxRate
        const newTotalAmount = totalAmount + shippingCharge + taxAmount;
        const formattedTotalAmount = newTotalAmount.toFixed(2)

        return res.status(200).json({ success: true, formattedTotalAmount })

    } catch (error) {
        console.log('error removing the coupon', error)
    }
}

//place order
const placeOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod, productId, razorpayPaymentId } = req.body;
        const userId = req.session.user;

        if (!addressId || !paymentMethod) {
            req.flash('error', 'Please select address and payment method');
            return res.redirect(`/checkout`);
        }

        // For COD, don't need to save payment details
        let payment_id = null;
        let transactionStatus = 'pending';
        let razorpayOrderId = null;

        // Retrieve cart details
        const cart = await Cart.findOne({ user_id: userId })
            .populate({
                path: 'items.product_id',
                populate: [
                    {
                        path: 'offer_id',
                        match: { _id: { $ne: null } }
                    },
                    {
                        path: 'category_id',
                        populate: {
                            path: 'offer_id',
                            match: { _id: { $ne: null } }
                        }
                    }
                ]
            });

        if (!cart || cart.items.length === 0) {
            req.flash('error', 'Your cart is empty.');
            return res.redirect('/cart-page');
        }

        // Detailed offer and price calculation
        let offerDiscount = 0;
        let originalPrice = 0;
        let totalAmount = 0;
        let totalAmountAfterDiscount = 0;

        // const totalAmount = cart.items.reduce((total, item) => total + item.product_id.price * item.quantity, 0);

        for (const item of cart.items) {
            const product = item.product_id
            let productOfferDiscount = 0;
            let categoryOfferDiscount = 0;

            // Apply product-level offer if exists
            if (product.offer_id && product.offer_id.status === 'active' &&
                (!product.offer_id.end_date || new Date(product.offer_id.end_date) > new Date()))
            {
                productOfferDiscount = (product.price * product.offer_id.discount_value) / 100;
            }

            // Apply category-level offer if no product-level offer
            if ((!product.offer_id || product.offer_id.status !== 'active') && 
                product.category_id && 
                product.category_id.offer_id && 
                product.category_id.offer_id.status === 'active' &&
                (!product.category_id.offer_id.end_date || new Date(product.category_id.offer_id.end_date) > new Date()))
            {
                categoryOfferDiscount = (product.price * product.category_id.offer_id.discount_value) / 100;
            }

            if (product.available_quantity < item.quantity) {
                req.flash('error', `Only ${item.product_id.available_quantity} left in stock for ${item.product_id.title}.`);
                return res.redirect('/cart-page');
            }

            originalPrice += product.price * item.quantity;
            totalAmount += product.price * item.quantity;
            offerDiscount += (productOfferDiscount + categoryOfferDiscount) * item.quantity;
            totalAmountAfterDiscount += (product.price - productOfferDiscount - categoryOfferDiscount) * item.quantity;
        }

        
        // Calculate tax and other charges
        const taxRate = 0.12;
        const taxAmount = totalAmountAfterDiscount * taxRate
        const shippingCharges = 100;

        let couponDiscount = 0;
        if (req.session.coupon) {
            const coupon = await Coupon.findOne({code:req.session.coupon.code}) ;
            const couponId = coupon._id;

            // Validate coupon
            if (coupon.is_active !== 'active' || new Date(coupon.expiry_date) < new Date() || coupon.used_by.includes(userId)) {
                req.flash('error', 'Invalid or expired coupon');
                return res.redirect('/checkout');
            }

            // Apply coupon discount
            if (coupon.coupon_type === 'fixed') {
                couponDiscount = coupon.discount_value;
            } else if (coupon.coupon_type === 'percentage') {
                couponDiscount = (totalAmountAfterDiscount * coupon.discount_value) / 100;
            }
        }

        const discount = offerDiscount + couponDiscount;
        // if (isNaN(discount)) {
        //     console.log('Total discount calculation resulted in NaN');
        // } else {
        //     console.log('guiss')
        // }
        const netAmount = (totalAmountAfterDiscount + shippingCharges + taxAmount).toFixed(2);

        if(paymentMethod == 'COD' && parseFloat(netAmount) > 1000) {
            req.flash('error', 'COD is not available for orders above Rs. 1000')
            return res.redirect('/checkout')
        }

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
            const netAmountinPaise = parseInt(netAmount) * 100

            // Create Razorpay order
            const razorpayOrder = await razorpay.orders.create({
                amount: netAmountinPaise,
                currency: 'INR',
                receipt: `order_${savedPayment._id}`,
            });

            razorpayOrderId = razorpayOrder.id;
            savedPayment.razorpay_order_id = razorpayOrderId;
            await savedPayment.save();
            payment_id = savedPayment._id;
        } else {
            payment_id = null
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
            offer_discount: offerDiscount,
            coupon_discount: couponDiscount,
        });

        const savedOrder = await newOrder.save();

        // Create order items
        const orderItems = new OrderItems({
            order_id: savedOrder._id,
            items: cart.items.map((item) => {
                const product = item.product_id;
                
                // Calculate the item price after discount
                let productOfferDiscount = 0;
                let categoryOfferDiscount = 0;

                // Apply product-level offer if exists
                if (product.offer_id && product.offer_id.status === 'active' &&
                    (!product.offer_id.end_date || new Date(product.offer_id.end_date) > new Date())) {
                    productOfferDiscount = (product.price * product.offer_id.discount_value) / 100;
                }

                // Apply category-level offer if no product-level offer
                if ((!product.offer_id || product.offer_id.status !== 'active') &&
                    product.category_id &&
                    product.category_id.offer_id &&
                    product.category_id.offer_id.status === 'active' &&
                    (!product.category_id.offer_id.end_date || new Date(product.category_id.offer_id.end_date) > new Date())) {
                    categoryOfferDiscount = (product.price * product.category_id.offer_id.discount_value) / 100;
                }

                const itemPriceAfterDiscount = (product.price - productOfferDiscount - categoryOfferDiscount) * item.quantity;

                return {
                    product_id: product._id,
                    quantity: item.quantity,
                    total_amount: itemPriceAfterDiscount,  // Use the calculated item total amount
                };
            }),
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

        // Clear the coupon from session and update the coupon with the userId
        if (req.session.coupon) {
            const couponCode = req.session.coupon.code;

            // Update the coupon with the userId
            await Coupon.findOneAndUpdate(
                { code: couponCode },
                { $addToSet: { used_by: userId } }
            );

            delete req.session.coupon;
        }

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
                       
                    } catch (razorpayError) {
                        console.error('Razorpay refund error in cancel user:', razorpayError);
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