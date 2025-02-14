const Order = require('../../models/orderSchema');
const OrderItems = require('../../models/orderItemsSchema');
const Address = require('../../models/addressSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema')
const Payment = require('../../models/paymentSchema')
const Transaction = require('../../models/transactionSchema')
const Razorpay = require('razorpay')
const Wallet = require('../../models/walletSchema')
const WalletTransaction = require('../../models/walletTransactionSchema')

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});


const getOrders = async (req, res) => {
    try {
        const orders = await Order.find({ payment_status: { $ne: 'failed' } }).populate('user_id').populate('address_id').populate('payment_id').sort({created_at: -1})
        for (const order of orders) {
            const orderItems = await OrderItems.find({ order_id: order._id })
                .populate({ path: 'items.product_id', populate: { path: 'category_id' } })
            order.orderItems = orderItems
        }

        return res.render('orders', {
            orders,
            success: req.flash('success'),
            error: req.flash('error'),
        })
    } catch (error) {
        console.log("error loading the orders page", error)
    }
}

//update order status
const updateOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.orderId
        const productId = req.params.productId
        const status = req.body.status

        const order = await Order.findById(orderId)

        if (!order) {
            req.flas('error', 'Order not found')
            return res.redirect('/admin/orders')
        }

        const orderItems = await OrderItems.findOne({ order_id: orderId })
        if (!orderItems) {
            req.flash('error', 'Order item not found')
            return res.redirect('/admin/orders')
        }

        const itemIndex = orderItems.items.findIndex(item => item.product_id.toString() === productId)

        if (itemIndex < 0) {
            req.flash('error', 'Product not found in the order')
            return res.redirect('/admin/orders')
        }

        if (orderItems.items[itemIndex].status === status) {
            req.flash('error', `product is already ${status}`)
            return res.redirect('/admin/orders')
        }

        //update the item status
        orderItems.items[itemIndex].status = status

        // Set the delivery date if the status is delivered
        if (status === 'delivered') {
            orderItems.items[itemIndex].delivery_date = new Date()
        }

        await orderItems.save();

        //if status is canceled, update the product quantity and payment
        if(status === 'canceled'){
            const item = orderItems.items[itemIndex]

            //update the product quantity
            await Product.findByIdAndUpdate(productId, {
                $inc:{available_quantity: item.quantity}
            })

            //calculate the refund amount
            const refundAmount = item.total_amount

            //handle online payments
            if(order.payment_method !== 'COD') {
                const payment = await Payment.findById(order.payment_id)
                if(payment) {
                    if(payment.status !== 'refunded') {
                        payment.refunded_amount = (payment.refunded_amount || 0) + refundAmount
                        payment.status = payment.refunded_amount === order.netAmount ? 'refunded' : 'partially_refunded';
                        await payment.save()
                    }

                    //update transaction status
                    const transaction = await Transaction.findOne({payment_id: payment._id})
                    if(transaction) {
                        transaction.refunded_amount = (transaction.refunded_amount || 0) + refundAmount
                        transaction.status = payment.status
                        await transaction.save()
                    }

                    if(payment.razorpay_order_id) {
                        try {
                            const razorpayRefund = await razorpay.payments.refund(payment.razorpay_order_id, {
                                amount: refundAmount * 100, // Amount in paise
                            });

                        } catch (error) {
                            console.error('Razorpay refund error in cancel:', error);
                            return res.status(500).json({
                                success: false,
                                message: 'Failed to process Razorpay refund. Please try again later.',
                            });
                        }
                    }
                } else {
                    console.error('Payment record not found for order:', orderId);
                }
            }
        }

        req.flash('success', `order status updated to ${status}`)
        return res.redirect('/admin/orders')
    } catch (error) {
        console.log("error updating order status", error)
    }
}

// approve return request
const approveReturn = async (req, res) => {
    try {
        const orderId = req.params.orderId
        const productId = req.params.productId

        const orderItem = await OrderItems.findOne({ order_id: orderId })

        if (!orderItem) {
            req.flash('error', 'order not foud')
            return res.redirect('/admin/orders')
        }

        const item = orderItem.items.find(item => item.product_id.toString() === productId)

        if (!item) {
            req.flash('error', 'items not found in the order')
            return res.redirect('/admin/orders')
        }

        if (item.status === 'return_approved') {
            req.flash('error', 'Return request has already been approved.');
            return res.redirect('/admin/orders');
        }

        item.status = 'return_approved'
        await orderItem.save()

        //update the product quantity after the return
        await Product.findByIdAndUpdate(productId, {
            $inc: { available_quantity: item.quantity },
        });

        //handle the online payments
        const order = await Order.findById(orderId)
        if (order.payment_method !== 'COD') {
            const refundAmount = item.total_amount

            const payment = await Payment.findById(order.payment_id)
            if (payment) {
                payment.refunded_amount = (payment.refunded_amount || 0) + refundAmount
                payment.status = payment.refunded_amount === order.netAmount ? 'refunded' : 'partially_refunded'
                await payment.save()

                const transaction = await Transaction.findOne({ payment_id: payment._id })
                if (transaction) {
                    transaction.refunded_amount = (transaction.refunded_amount || 0) + refundAmount
                    transaction.status = payment.status
                    await transaction.save()
                }

                //razorpay refund
                if (payment.razorpay_payment_id) {
                    try {
                        const razorpayRefund = await razorpay.payments.refund(payment.razorpay_payment_id, {
                            amount: refundAmount * 100, // Amount in paise
                        });

                    } catch (razorpayError) {
                        console.error('Razorpay refund error in return:', razorpayError);
                        return res.status(500).json({
                            success: false,
                            message: 'Failed to process Razorpay refund. Please try again later.',
                        });
                    }
                }
            } else {
                console.error('Error approving return request:', error);
                req.flash('error', 'Internal server error while approving return request.');
                return res.redirect('/admin/orders');
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

                await walletTransaction.save();
            } else {
                console.log('wallet not found when return approve')
            }
        }

        req.flash('success', 'return request approved!')
        return res.redirect('/admin/orders')

    } catch (error) {
        console.log('error approving return request', error)
        res.status(500).json('Error approving reutrn')
    }
}

//reject the return request
const rejectReturn = async (req, res) => {
    try {
        const orderId = req.params.orderId
        const productId = req.params.productId

        const orderItem = await OrderItems.findOne({ order_id: orderId })
        if (!orderItem) {
            req.flash('error', 'Order not found')
            return res.redirect('/admin/orders')
        }

        const item = orderItem.items.find(item => item.product_id.toString() === productId)

        if (!item) {
            req.flash('error', 'items not found in the order')
            return res.redirect('/admin/orders')
        }

        item.status = 'return_rejected'
        await orderItem.save();

        req.flash('success', 'request has been rejected!')
        return res.redirect('/admin/orders')

    } catch (error) {
        console.log('error rejecting return request', error)
        req.flash('error', 'error rejecting the request')
        return res.redirect('/admin/orders')
    }
}

module.exports = {
    getOrders,
    updateOrderStatus,
    approveReturn,
    rejectReturn,
}