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
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            req.flash('validationError', errors.array());
            req.flash('data', req.body);
            return res.redirect('/admin/login');
        }

        const { email, password } = req.body;

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
            const page = parseInt(req.query.page) || 1
            const limit = 10
            const skip = (page - 1) * limit

            // extract filter params
            const { fromDate, toDate, month, year } = req.query

            const pipeline = [
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $lookup: {
                        from: 'addresses',
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
                        from: 'products',
                        localField: 'orderItems.items.product_id',
                        foreignField: '_id',
                        as: 'productDetails'
                    }
                },
                {
                    $unwind: { path: '$orderItems', preserveNullAndEmptyArrays: true }
                },
                {
                    $unwind: { path: '$orderItems.items', preserveNullAndEmptyArrays: true }
                },  
                {
                    $unwind: { path: '$user', preserveNullAndEmptyArrays: true }
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
                        productDetails: { title: 1 },
                        orderMonth: { $month: '$order_date' },
                        orderYear: { $year: '$order_date' }
                    }
                },
            ]

            // add filter to the pipeline
            const matchStage = {}
            if (month && !isNaN(parseInt(month))) {
                matchStage.orderMonth = parseInt(month)
            }
            if (year && !isNaN(parseInt(year))) {
                matchStage.orderYear = parseInt(year)
            }

            // date range filter
            if (fromDate && toDate) {
                matchStage.order_date = {
                    $gte: new Date(fromDate),
                    $lte: new Date(toDate)
                }
            }

            // Add match stage first if filters exist
            if (Object.keys(matchStage).length > 0) {
                pipeline.push({ $match: matchStage })
            }

            // sort and final aggregation
            pipeline.push(
                { $sort: { order_date: -1 } },
                { $skip: skip },
                { $limit: limit }
            )

            // get the number of total items after filteration
            const totalItemsPipeline = [
                { $match: matchStage },
                { $count: 'totalItems' }
            ]

            const totalItemsResult = await Order.aggregate(totalItemsPipeline)
            const totalItems = totalItemsResult[0]?.totalItems || 0
            const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1

            // fetch data
            const [ totalUsers, totalOrders, totalSales, salesReport,bestSellingProducts] = await Promise.all([
                User.countDocuments(fromDate && toDate ? {
                    createdAt: {
                        $gte: new Date(fromDate),
                        $lte: new Date(toDate)
                    }
                } : {}),    
                Order.countDocuments(),
                Order.aggregate([{ $group: { _id: null, totalSales: { $sum: '$netAmount' }}}]),
                Order.aggregate(pipeline),
                Order.aggregate([
                    {
                        $lookup: {
                            from: 'orderitems', // The name of the orderItems collection
                            localField: '_id',
                            foreignField: 'order_id', // Assuming order_id is the field in orderItems that references Order
                            as: 'orderItems'
                        }
                    },
                    { $unwind: '$orderItems' },
                    { $unwind: '$orderItems.items' },
                    {
                        $group: {
                            _id: '$orderItems.items.product_id',
                            totalQuantity: { $sum: '$orderItems.items.quantity' }
                        }
                    },
                    {
                        $lookup: {
                            from: 'products',
                            localField: '_id',
                            foreignField: '_id',
                            as: 'productDetails'
                        }
                    },
                    { $unwind: '$productDetails' },
                    { $sort: { totalQuantity: -1 } },
                    { $limit: 10 }
                ])

            ])

            console.log('sales report with orderItems', salesReport)
            salesReport.forEach(order => {
                console.log('Order ID:', order._id);
                console.log('Order Items:', order.orderItems);
            });
            console.log('best selling', bestSellingProducts)

            // report data for the chart
            const salesData = salesReport.reduce((acc,order) => {
                const monthYear = `${order.orderMonth}-${order.orderYear}`
                if(!acc[monthYear]) {
                    acc[monthYear] = 0
                }
                acc[monthYear] += order.netAmount
                return acc
            }, {})

            const chartLabels = Object.keys(salesData)
            const chartData = Object.values(salesData)

            res.render('dashboard', {
                totalUsers,
                totalOrders,
                salesReport: salesReport || [],
                totalSales: totalSales[0]?.totalSales || 0,
                currentPage: page,
                itemsPerPage: limit,
                totalPages,
                selectedMonth: month,
                selectedYear: year,
                fromDate,
                toDate,
                salesData: {
                    labels: chartLabels,
                    data: chartData
                },
                bestSellingProducts
            })

        } else {
            res.redirect('/admin/login')
        }
    } catch (error) {
        console.error('error loadin dashboard', error)
        res.redirect('/admin/error-page')
    }
}

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