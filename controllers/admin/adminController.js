const User = require('../../models/userSchema')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const session = require('express-session')
const { validationResult } = require('express-validator')
const Order = require('../../models/orderSchema')

const pageError = async (req, res) => {
    try {
        res.render('error-page')
    } catch (error) {
        console.log("error loadin the error-page", error)
    }
}

const loadLogin = async (req, res) => {
    try {
        if (req.session.admin) {
            res.redirect('/admin')
        } else {
            res.render('admin-login', {
                message: null,
                messageType: null,
                error: req.flash('error'),
                validationError: req.flash('validationError'),
                data: req.flash('data')
            })
        }
    } catch (error) {
        console.error("error loading admin login", error)
    }
}

//login admin
const login = async (req, res) => {
    try {
        const errors = validationResult(req);  // Validation errors

        if (!errors.isEmpty()) {
            // Store validation errors and form data
            req.flash('validationError', errors.array());
            req.flash('data', req.body);
            return res.redirect('/admin/login'); // Redirect to login page
        }

        const { email, password } = req.body
        const admin = await User.findOne({ email, is_admin: true })
        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password)
            if (passwordMatch) {
                req.session.admin = true
                return res.redirect('/admin')
            } else {
                req.flash('error', 'Invalid username or password. Please try again.')
                return res.redirect('/admin/login')
            }
        } else {
            req.flash('error', 'Invalid username or password. Please try again.')
            return res.redirect('/admin/login')
        }
    } catch (error) {
        console.error("error login admin", error)
        return res.redirect('/admin/error-page')
    }
}

//load dashboard
const loadDashboard = async (req, res) => {
    try {
        if (req.session.admin) {
            // Fetch data for total users, orders, and sales
            const totalUsers = await User.countDocuments()
            const totalOrders = await Order.countDocuments()
            const totalSales = await Order.aggregate([
                { $group: { _id: null, totalSales: { $sum: '$netAmount' } } }
            ])

            const salesReport = await Order.aggregate([
                {
                    $lookup: {
                        from: 'users', // Collection name for the User model
                        localField: 'user_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $lookup: {
                        from: 'payments', // Collection name for the Payment model
                        localField: 'payment_id',
                        foreignField: '_id',
                        as: 'payment'
                    }
                },
                {
                    $lookup: {
                        from: 'addresses', // Collection name for the Address model
                        localField: 'address_id',
                        foreignField: '_id',
                        as: 'address'
                    }
                },
                {
                    $lookup: {
                        from: 'orderitems',
                        localField: '_id',
                        foreignField: 'order_id',
                        as: 'orderItems'
                    }
                },
                {
                    $lookup: {
                        from: 'products', // Collection name for Product model
                        localField: 'orderItems.items.product_id',
                        foreignField: '_id',
                        as: 'productDetails'
                    }
                },
                {
                    $unwind: { path: '$orderItems', preserveNullAndEmptyArrays: true }
                },
                {
                    $unwind: { path: '$user', preserveNullAndEmptyArrays: true } // Optional for non-COD orders
                },
                {
                    $unwind: { path: '$payment', preserveNullAndEmptyArrays: true }
                },
                {
                    $unwind: { path: '$address', preserveNullAndEmptyArrays: true }
                },
                {
                    $project: {
                        _id: 1,
                        order_date: 1,
                        delivery_date: 1,
                        shipping_chrg: 1,
                        total: 1,
                        netAmount: 1,
                        discount: 1,
                        payment_method: 1,
                        'user.first_name': 1,
                        'user.email': 1,
                        'address.city': 1,
                        'address.pincode': 1,
                        'payment.status': 1,
                        'payment.transaction_id': 1,
                        'orderItems.items': 1,
                        productDetails: { title: 1 }
                    }
                },
                { $sort: { order_date: -1 } } // Sort by recent orders first
            ]);

            console.log('salesReport',salesReport)

            // Render the dashboard with the fetched data
            res.render('dashboard', {
                totalUsers,
                totalOrders,
                salesReport,
                totalSales: totalSales[0]?.totalSales || 0
            })
        } else {
            res.redirect('/admin/login') // Redirect if no admin session
        }
    } catch (error) {
        console.error('error loadin dashboard', error)
        res.redirect('/admin/error-page')
    }
}

//get sales data for the graph
// const getGraph = async (req, res) => {
//     try {
//         const { startDate, endDate } = req.body

//         const match = {}
//         if (startDate) match.order_date = { $gte: new Date(startDate) }
//         if (endDate) match.order_date = { ...match.order_date, $lte: new Date(endDate) };

//         const salesData = await Order.aggregate([
//             { $match: match },
//             {
//                 $group: {
//                     _id: { $dateToString: { format: "%Y-%m-%d", date: "$order_date" } },
//                     totalSales: { $sum: '$netAmount' },
//                     totalOrder: { $sum: 1 }
//                 },
//             },
//             { $sort: { _id: 1 } },
//         ])

//         res.json(salesData);
//     } catch (error) {
//         console.log('error gettin the graph data', error)
//         res.status(500).json({ error: 'Failed to fetch sales data' });
//     }
// }

const logout = async (req, res) => {
    try {
        req.session.destroy(err => {
            if (err) {
                console.log("error destroying admin session", err)
            }
            res.redirect('/admin/login')
        })
    } catch (error) {
        console.log("error during admin logout", error)
        res.redirect("/admin/error-page")
    }
}

module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout,
    // getGraph,
}