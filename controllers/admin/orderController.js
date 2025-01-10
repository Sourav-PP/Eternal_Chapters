const Order = require('../../models/orderSchema');
const OrderItems = require('../../models/orderItemsSchema');
const Address = require('../../models/addressSchema');
const user = require('../../models/userSchema');

const getOrders = async (req, res) => {
    try {
        const orders = await Order.find().populate('user_id').populate('address_id').populate('payment_id')
        for(const order of orders){
            const orderItems = await OrderItems.find({order_id: order._id})
            .populate({path: 'items.product_id', populate: {path: 'category_id'}})
            order.orderItems = orderItems
        }

        console.log('orders',orders)

        return res.render('orders', {
            orders,
            success: req.flash('success'),
        })
    } catch (error) {
        console.log("error loading the orders page", error)
    }
}

//update order status
const updateOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.id
        const status = req.body.status

        await Order.findByIdAndUpdate(orderId, {status},{new: true})

        req.flash('success', 'Order status updated successfully')
        return res.redirect('/admin/orders')
    } catch (error) {
        console.log("error updating order status", error)
    }
}

module.exports = {
    getOrders,
    updateOrderStatus,
}