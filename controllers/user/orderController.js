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
const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const crypto = require('crypto')

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

//get the checkout page
const checkout = async (req, res) => {
    try {
        const productId = req.query.productId
        const quantityInProduct = parseInt(req.query.quantity) || 1
        const userId = req.session.user
        const coupons = await Coupon.find({ is_active: 'active' })

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
            product = await Product.findById(productId).populate('offer_id').populate({ path: 'category_id', populate: { path: 'offer_id' } })

            if (!product) {
                req.flash('error', 'product not found')
                return res.redirect(`/productDetails?id=${productId}`)
            }

            let productOfferDiscount = 0
            let categoryOfferDiscount = 0

            // apply product-level offer if active
            if (product.offer_id && product.offer_id.status === 'active' &&
                (!product.offer_id.end_date || new Date(product.offer_id.end_date) > new Date())) {

                productOfferDiscount = (product.price * product.offer_id.discount_value) / 100

            }

            // apply category-level offer if active
            if ((!product.offer_id || product.offer_id.status !== 'active') &&
                product.category_id &&
                product.category_id.offer_id &&
                product.category_id.offer_id.status === 'active' &&
                (!product.category_id.offer_id.end_date || new Date(product.category_id.offer_id.end_date) > new Date())) {
                categoryOfferDiscount = (product.price * product.category_id.offer_id.discount_value) / 100
            }

            numberOfItems = quantityInProduct
            originalPrice = product.price * quantityInProduct
            offerDiscount += (productOfferDiscount + categoryOfferDiscount) * quantityInProduct
            totalAmount = (product.price - productOfferDiscount - categoryOfferDiscount) * quantityInProduct
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
                    (!product.offer_id.end_date || new Date(product.offer_id.end_date) > new Date())) {
                    offerPercentage = product.offer_id.discount_value
                    productOfferDiscount = (product.price * product.offer_id.discount_value) / 100

                }

                // Apply category-level offer if no product-level offer
                if ((!product.offer_id || product.offer_id.status !== 'active') &&
                    product.category_id &&
                    product.category_id.offer_id &&
                    product.category_id.offer_id.status === 'active' &&
                    (!product.category_id.offer_id.end_date || new Date(product.category_id.offer_id.end_date) > new Date())) {
                    categoryOfferDiscount = (product.price * product.category_id.offer_id.discount_value) / 100
                }

                numberOfItems += item.quantity
                originalPrice += product.price * item.quantity
                offerDiscount += (productOfferDiscount + categoryOfferDiscount) * item.quantity;

                return total + (product.price - productOfferDiscount - categoryOfferDiscount) * item.quantity;

            }, 0)
        }

        taxAmount = Number((totalAmount * taxRate).toFixed(2));
        netAmount = (totalAmount + shippingCharge + taxAmount)
        let discount = offerDiscount + couponDiscount


        res.render('checkout', {
            productId,
            quantityForBuyNow: quantityInProduct,
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
        const { couponCode, productId, quantity } = req.body;
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
        if (coupon.used_by && coupon.used_by.includes(userId)) {
            return res.json({ success: false, message: 'You have already used this coupon!' })
        }

        let totalAmount = 0
        let offerDiscount = 0
        let couponApplicableAmount = 0

        // handle single product purchase
        if (productId && quantity) {
            const product = await Product.findById(productId)
                .populate('offer_id')
                .populate({
                    path: 'category_id',
                    populate: {
                        path: 'offer_id'
                    }
                })

            if (!product) {
                return res.json({ success: flase, message: 'Product not found!' })
            }

            let productPrice = product.price
            let productOfferDiscount = 0
            let categoryOfferDiscount = 0

            // apply product-level offer
            if (product.offer_id && product.offer_id.status === 'active' &&
                (!product.offer_id.end_date || new Date(product.offer_id.end_date) > new Date())) {
                productOfferDiscount = (product.price * product.offer_id.discount_value) / 100
            }

            // apply category-level offer
            if ((!product.offer_id || product.offer_id.status !== 'active') &&
                product.category_id &&
                product.category_id.offer_id &&
                product.category_id.offer_id.status === 'active' &&
                (!product.category_id.offer_id.end_date || new Date(product.category_id.offer_id.end_date) > new Date())) {
                categoryOfferDiscount = (product.price * product.category_id.offer_id.discount_value) / 100
            }

            offerDiscount = (productOfferDiscount + categoryOfferDiscount) * quantity
            productPrice -= (productOfferDiscount + categoryOfferDiscount);

            totalAmount = productPrice * quantity
            couponApplicableAmount = totalAmount
        } else {
            // handle cart purchase
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

            cart.items.forEach((item) => {
                const product = products.find(p => p._id.toString() === item.product_id.toString())
                if (!product) return

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
        }

        let couponDiscount = 0
        let discountValue = 0

        if (coupon.coupon_type === 'percentage') {
            discountValue = coupon.discount_value
            couponDiscount = (couponApplicableAmount * coupon.discount_value) / 100

            // if (coupon.max_discount && couponDiscount > coupon.max_discount) {
            //     couponDiscount = coupon.max_discount;
            // }
        } else if (coupon.coupon_type === 'fixed') {
            discountValue = coupon.discount_value
            couponDiscount = Math.min(coupon.discount_value, couponApplicableAmount)
        }

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
        const { productId, quantity } = req.body
        const userId = req.session.user
        delete req.session.coupon;

        let totalAmount = 0
        let offerDiscount = 0

        if (productId && quantity) {
            // handle signle buy not condition
            const product = await Product.findById(productId)
                .populate('offer_id')
                .populate({
                    path: 'category_id',
                    populate: ({ path: 'offer_id' })
                })

            if (!product) {
                return res.json({ success: false, message: 'Product not found!' })
            }

            let productPrice = product.price
            let productOfferDiscount = 0
            let categoryOfferDiscount = 0

            // Apply product-level offer
            if (product.offer_id && product.offer_id.status === 'active' &&
                (!product.offer_id.end_date || new Date(product.offer_id.end_date) > new Date())) {
                productOfferDiscount = (product.price * product.offer_id.discount_value) / 100;
            }

            // Apply category-level offer
            if ((!product.offer_id || product.offer_id.status !== 'active') &&
                product.category_id &&
                product.category_id.offer_id &&
                product.category_id.offer_id.status === 'active' &&
                (!product.category_id.offer_id.end_date || new Date(product.category_id.offer_id.end_date) > new Date())) {
                categoryOfferDiscount = (product.price * product.category_id.offer_id.discount_value) / 100;
            }

            offerDiscount = (productOfferDiscount + categoryOfferDiscount) * quantity;
            productPrice -= (productOfferDiscount + categoryOfferDiscount);

            totalAmount = productPrice * quantity;

        } else {
            // handle cart purchase
            const cart = await Cart.findOne({ user_id: userId })
            if (!cart) {
                return res.json({ success: false, message: 'Your cart is empty.' });
            }

            // Fetch all product ids
            const productIds = cart.items.map(item => item.product_id);
            const products = await Product.find({ '_id': { $in: productIds } })
                .populate('offer_id') // Populate product-level offer
                .populate({
                    path: 'category_id',
                    populate: {
                        path: 'offer_id' // Populate category-level offer
                    }
                });

            cart.items.forEach((item) => {
                const product = products.find(p => p._id.toString() === item.product_id.toString());
                if (!product) return;

                const quantity = item.quantity;
                let productPrice = product.price;
                let productOfferDiscount = 0;
                let categoryOfferDiscount = 0;

                // Apply product-level offer
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

                offerDiscount += (productOfferDiscount + categoryOfferDiscount) * quantity;
                productPrice -= (productOfferDiscount + categoryOfferDiscount);

                // Total amount after applying offer
                totalAmount += productPrice * quantity;
            });
        }

        // calculate the final amount
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
        const { addressId, paymentMethod, productId, razorpayPaymentId, quantity } = req.body;
        const userId = req.session.user;

        if (!addressId || !paymentMethod) {
            req.flash('error', 'Please select address and payment method');
            return res.redirect(`/checkout`);
        }

        // For COD, don't need to save payment details
        let payment_id = null;
        let transactionStatus = 'pending';
        let razorpayOrderId = null;

        let cart = null
        let items = []
        let totalAmount = 0
        let offerDiscount = 0
        let originalPrice = 0
        let totalAmountAfterDiscount = 0

        if (productId) {
            const product = await Product.findById(productId).populate('offer_id').populate({ path: 'category_id', populate: { path: 'offer_id' } })
            const quantityInProduct = parseInt(quantity) || 1

            if (!product) {
                req.flash('error', 'Product not found')
                return res.redirect(`/productDetails?id=${productId}`)
            }

            let productOfferDiscount = 0
            let categoryOfferDiscount = 0

            // apply product-level offer
            if (product.offer_id && product.offer_id.status === 'active' &&
                (!product.offer_id.end_date || new Date(product.offer_id.end_date) > new Date())) {
                productOfferDiscount = (product.price * product.offer_id.discount_value) / 100
            }

            // apply category-level offer
            if ((!product.offer_id || product.offer_id.status !== 'active') &&
                product.category_id &&
                product.category_id.offer_id &&
                product.category_id.offer_id.status === 'active' &&
                (!product.category_id.offer_id.end_date || new Date(product.category_id.offer_id.end_date) > new Date())) {
                categoryOfferDiscount = (product.price * product.category_id.offer_id.discount_value) / 100
            }

            if (product.available_quantity < quantityInProduct) {
                req.flash('error', `Only ${product.available_quantity} left in stock for ${product.title}.`);
                return res.redirect(`/productDetails?id=${productId}`);
            }

            originalPrice = product.price * quantityInProduct
            totalAmount = product.price * quantityInProduct
            offerDiscount = (productOfferDiscount + categoryOfferDiscount) * quantityInProduct
            totalAmountAfterDiscount = (product.price - productOfferDiscount - categoryOfferDiscount) * quantityInProduct

            items.push({
                product_id: product._id,
                quantity: quantityInProduct,
                total_amount: product.price * quantityInProduct,
            })

            const newQuantity = product.available_quantity - quantityInProduct;
            await Product.findByIdAndUpdate(product._id, { available_quantity: newQuantity });

        } else {
            // handle the normal cart checkout
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

            if (!cart || cart.items.length === 0) {
                req.flash('error', 'Your cart is empty.');
                return res.redirect('/cart-page');
            }

            for (const item of cart.items) {
                const product = item.product_id
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

                if (product.available_quantity < item.quantity) {
                    req.flash('error', `Only ${item.product_id.available_quantity} left in stock for ${item.product_id.title}.`);
                    return res.redirect('/cart-page');
                }

                originalPrice += product.price * item.quantity;
                totalAmount += product.price * item.quantity;
                offerDiscount += (productOfferDiscount + categoryOfferDiscount) * item.quantity;
                totalAmountAfterDiscount += (product.price - productOfferDiscount - categoryOfferDiscount) * item.quantity;

                items.push({
                    product_id: product._id,
                    quantity: item.quantity,
                    total_amount: product.price * item.quantity,
                })

                // Update product quantities for cart items
                const newQuantity = product.available_quantity - item.quantity;
                if (newQuantity >= 0) {
                    await Product.findByIdAndUpdate(product._id, { available_quantity: newQuantity });
                } else {
                    req.flash('error', `Not enough stock for ${product.title}.`);
                    return res.redirect('/cart-page');
                }
            }

        }

        // Calculate tax and other charges
        const taxRate = 0.12;
        const shippingCharges = 100;
        const taxAmount = totalAmountAfterDiscount * taxRate


        let couponDiscount = 0;
        if (req.session.coupon) {
            const coupon = await Coupon.findOne({ code: req.session.coupon.code });
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
        const netAmount = (totalAmountAfterDiscount + shippingCharges + taxAmount - couponDiscount).toFixed(2);

        if (paymentMethod == 'COD' && parseFloat(netAmount) > 1000) {
            req.flash('error', 'COD is not available for orders above Rs. 1000')
            return res.redirect(`/checkout?productId=${productId}&quantity=${quantity}`)
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
            tax_amount: taxAmount.toFixed(2),
            discount: discount.toFixed(2),
            offer_discount: offerDiscount,
            coupon_discount: couponDiscount,
        });

        const savedOrder = await newOrder.save();

        // Create order items
        const orderItems = new OrderItems({
            order_id: savedOrder._id,
            items,
        });

        await orderItems.save();

        // Create transaction
        const newTransaction = new Transaction({
            status: transactionStatus,
            amount: netAmount,
            payment_id: payment_id,
        });
        await newTransaction.save();

        // Clear the cart if order is from cart
        if (!productId) {
            await Cart.findOneAndDelete({ user_id: userId });
        }

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

// gerate Invoice
const generateInvoice = async (req, res) => {
    try {
        const orderId = req.params.id;

        // Fetch order details using aggregation
        const orderData = await Order.aggregate([
            {
                $match: { _id: new mongoose.Types.ObjectId(orderId) },
            },
            {
                $lookup: {
                    from: "orderitems",
                    localField: "_id",
                    foreignField: "order_id",
                    as: "orderItems",
                },
            },
            { $unwind: "$orderItems" },
            { $unwind: "$orderItems.items" },
            {
                $lookup: {
                    from: "products",
                    localField: "orderItems.items.product_id",
                    foreignField: "_id",
                    as: "orderItems.items.product",
                },
            },
            { $unwind: "$orderItems.items.product" },
            {
                $group: {
                    _id: "$_id",
                    order_date: { $first: "$order_date" },
                    payment_method: { $first: "$payment_method" },
                    total: { $first: "$total" },
                    shipping_chrg: { $first: "$shipping_chrg" },
                    discount: { $first: "$discount" },
                    netAmount: { $first: "$netAmount" },
                    items: {
                        $push: {
                            title: "$orderItems.items.product.title",
                            quantity: "$orderItems.items.quantity",
                            price: "$orderItems.items.product.price",
                            total_amount: "$orderItems.items.total_amount",
                        },
                    },
                },
            },
        ]);

        const order = orderData[0];
        console.log('orderData', orderData)

        if (!order) {
            return res.status(404).send("Order not found");
        }

        // Define invoice directory and ensure it exists
        const invoiceDir = path.join(__dirname, "../invoices");
        if (!fs.existsSync(invoiceDir)) {
            fs.mkdirSync(invoiceDir, { recursive: true });
        }

        // Define invoice file path
        const invoicePath = path.join(invoiceDir, `invoice-${orderId}.pdf`);

        // Create PDF document
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        doc.pipe(fs.createWriteStream(invoicePath));
        doc.pipe(res);

        const regularFontPath = path.join(__dirname, "../../fonts/NotoSans-Regular.ttf");
        const boldFontPath = path.join(__dirname, "../../fonts/NotoSans-Bold.ttf");

        // Check if the font file exists
        if (!fs.existsSync(regularFontPath) || !fs.existsSync(boldFontPath)) {
            console.error("Font file not found:", regularFontPath, boldFontPath);
            return res.status(500).send("Internal Server Error: Font file not found");
        }

        doc.registerFont('NotoSans', regularFontPath);
        doc.registerFont('NotoSans-Bold', boldFontPath);

        // Header section remains the same...
        doc.fontSize(24)
           .font("NotoSans-Bold")
           .text("Eternal Chapters Bookstore", { align: "center" });
        
        doc.moveDown(0.5);
        
        doc.fontSize(12)
           .font("NotoSans")
           .text("123 Book Street, Library City", { align: "center" })
           .text("Email: sourav@gmail.com | Phone: +91 8921300157", { align: "center" });

        doc.moveDown(1);
        doc.strokeColor('#333333')
           .lineWidth(1)
           .moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke();
        doc.moveDown(1);

        // Invoice Title and Order Details remain the same...
        doc.fontSize(18)
           .font("NotoSans-Bold")
           .text("INVOICE", { align: "center" });
        
        doc.moveDown(1);

        // Order Details
        const details = [
            { label: "Order ID:", value: order._id },
            { label: "Order Date:", value: new Date(order.order_date).toLocaleDateString() },
            { label: "Payment Method:", value: order.payment_method }
        ];

        details.forEach(detail => {
            doc.font("NotoSans-Bold")
               .fontSize(12)
               .text(detail.label, 50, doc.y, { continued: true, width: 100 })
               .font("NotoSans")
               .text(detail.value);
        });

        doc.moveDown(1.5);

        // Improved Table Layout
        // Define table dimensions
        const tableLeft = 50;
        const tableRight = 550;
        const tableWidth = tableRight - tableLeft;
        
        // Define column widths
        const columns = {
            item: { x: tableLeft, width: tableWidth * 0.4 },             // 40% for item name
            qty: { x: tableLeft + (tableWidth * 0.4), width: tableWidth * 0.15 },    // 15% for quantity
            price: { x: tableLeft + (tableWidth * 0.55), width: tableWidth * 0.2 },  // 20% for price
            total: { x: tableLeft + (tableWidth * 0.75), width: tableWidth * 0.25 }  // 25% for total
        };

        // Draw table header
        const drawTableHeader = (y) => {
            // Header background
            doc.rect(tableLeft, y - 5, tableWidth, 25)
               .fillColor('#f6f6f6')
               .fill();
            
            // Header text
            doc.fillColor('#000000')
               .font("NotoSans-Bold")
               .fontSize(12);

            doc.text("Item", columns.item.x + 5, y, { width: columns.item.width - 10 });
            doc.text("Qty", columns.qty.x + 5, y, { width: columns.qty.width - 10, align: "center" });
            doc.text("Price", columns.price.x + 5, y, { width: columns.price.width - 10, align: "right" });
            doc.text("Total", columns.total.x + 5, y, { width: columns.total.width - 10, align: "right" });
        };

        // Draw table header
        drawTableHeader(doc.y);
        doc.moveDown(1);

        // Draw table rows
        order.items.forEach((item, i) => {
            const rowHeight = 25;
            const y = doc.y;

            // Row background for even rows
            if (i % 2 === 0) {
                doc.rect(tableLeft, y - 5, tableWidth, rowHeight)
                   .fillColor('#f9f9f9')
                   .fill();
            }

            doc.fillColor('#000000')
               .font("NotoSans")
               .fontSize(12);

            // Draw each column with proper alignment
            doc.text(item.title, columns.item.x + 5, y, { width: columns.item.width - 10 });
            doc.text(item.quantity.toString(), columns.qty.x + 5, y, { width: columns.qty.width - 10, align: "center" });
            doc.text(`₹${item.price.toFixed(2)}`, columns.price.x + 5, y, { width: columns.price.width - 10, align: "right" });
            doc.text(`₹${item.total_amount.toFixed(2)}`, columns.total.x + 5, y, { width: columns.total.width - 10, align: "right" });

            doc.moveDown(1.2);

            // Check for page break
            if (doc.y > 700) {
                doc.addPage();
                drawTableHeader(50);
                doc.moveDown(1);
            }
        });

        // Summary Section
        doc.moveDown(1);

        // Draw summary box
        const summaryWidth = 250;
        const summaryX = tableRight - summaryWidth;
        const summaryStartY = doc.y;

        // Summary background
        doc.rect(summaryX, summaryStartY, summaryWidth, 120)
           .fillColor('#f6f6f6')
           .fill();

        doc.fillColor('#000000');

        // Summary content with consistent alignment
        const summaryItems = [
            { label: "Subtotal:", value: order.total },
            { label: "Shipping Charge:", value: order.shipping_chrg },
            { label: "Discount:", value: -order.discount },
            { label: "Net Amount:", value: order.netAmount, isTotal: true }
        ];

        let currentY = summaryStartY + 10;

        summaryItems.forEach((item, index) => {
            const isLast = index === summaryItems.length - 1;
            
            // Add a line before the total
            if (isLast) {
                doc.strokeColor('#333333')
                   .moveTo(summaryX + 10, currentY)
                   .lineTo(summaryX + summaryWidth - 10, currentY)
                   .stroke();
                currentY += 10;
            }

            doc.font(item.isTotal ? "NotoSans-Bold" : "NotoSans")
               .fontSize(item.isTotal ? 14 : 12);

            // Label (left-aligned)
            doc.text(
                item.label,
                summaryX + 15,
                currentY,
                { width: summaryWidth * 0.6, align: "left" }
            );

            // Value (right-aligned)
            doc.text(
                `₹${Math.abs(item.value).toFixed(2)}`,
                summaryX + (summaryWidth * 0.6),
                currentY,
                { width: summaryWidth * 0.4 - 15, align: "right" }
            );

            currentY += item.isTotal ? 25 : 20;
        });

        // Footer
        doc.moveDown(2);
        doc.fontSize(10)
           .font("NotoSans")
           .text("Thank you for shopping with us!", { align: "center" });

        doc.end();



    } catch (error) {
        console.log('error generating the invoice', error)
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
    generateInvoice,
}