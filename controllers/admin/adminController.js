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
        if (!req.session.admin) {
            return res.redirect('/admin/login');
        }

        const { fromDate, toDate, month, year } = req.query;

        // Base match stage for filtering
        const baseMatchStage = {
            payment_status: { $ne: 'failed' }
        };

        // Add date and month/year filters if provided
        if (fromDate && toDate) {
            baseMatchStage.order_date = {
                $gte: new Date(fromDate),
                $lte: new Date(toDate)
            };
        } else if (month && year) {
            baseMatchStage.$expr = {
                $and: [
                    { $eq: [{ $month: '$order_date' }, parseInt(month)] },
                    { $eq: [{ $year: '$order_date' }, parseInt(year)] }
                ]
            };
        } else if (month) {
            baseMatchStage.$expr = {
                $eq: [{ $month: '$order_date' }, parseInt(month)]
            };
        } else if (year) {
            baseMatchStage.$expr = {
                $eq: [{ $year: '$order_date' }, parseInt(year)]
            };
        }

        // Fetch all required data in parallel
        const [totalUsers, totalOrders, totalSales, bestSellingProducts, bestSellingCategories, salesData] = await Promise.all([
            // Total Users
            User.countDocuments(fromDate && toDate ? {
                createdAt: {
                    $gte: new Date(fromDate),
                    $lte: new Date(toDate)
                }
            } : {}),

            // Total Orders
            Order.countDocuments(baseMatchStage),

            // Total Sales
            Order.aggregate([
                { $match: baseMatchStage },
                {
                    $group: {
                        _id: null,
                        totalSales: { $sum: '$netAmount' }
                    }
                }
            ]),

            // Best Selling Products
            Order.aggregate([
                { $match: baseMatchStage },
                {
                    $lookup: {
                        from: 'orderitems',
                        localField: '_id',
                        foreignField: 'order_id',
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
            ]),

            //best selling categories
            Order.aggregate([
                { $match: baseMatchStage },
                {
                    $lookup: {
                        from: 'orderitems',
                        localField: '_id',
                        foreignField: 'order_id',
                        as: 'orderItems'
                    }
                },
                { $unwind: '$orderItems' },
                { $unwind: '$orderItems.items' },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'orderItems.items.product_id',
                        foreignField: '_id',
                        as: 'productDetails'
                    }
                },
                { $unwind: '$productDetails' },
                {
                    $group: {
                        _id: '$productDetails.category_id',
                        totalQuantity: { $sum: '$orderItems.items.quantity' }
                    }
                },
                {
                    $lookup: {
                        from: 'categories',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'categoryDetails'
                    }
                },
                {$unwind: '$categoryDetails'},
                {$sort: {totalQuantity: -1}},
                {$limit: 10}
            ]),

            // Sales Data for Chart
            Order.aggregate([
                { $match: baseMatchStage },
                {
                    $group: {
                        _id: {
                            month: { $month: '$order_date' },
                            year: { $year: '$order_date' }
                        },
                        totalSales: { $sum: '$netAmount' }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ])
        ]);

        // Process sales data for chart
        const chartData = salesData.reduce((acc, item) => {
            const monthName = new Date(0, item._id.month - 1).toLocaleString('default', { month: 'long' });
            const label = `${monthName} ${item._id.year}`;
            return {
                labels: [...acc.labels, label],
                data: [...acc.data, item.totalSales]
            };
        }, { labels: [], data: [] });

        res.render('dashboard', {
            totalUsers,
            totalOrders,
            totalSales: totalSales[0]?.totalSales || 0,
            bestSellingProducts,
            bestSellingCategories,
            salesData: chartData,
            selectedMonth: month,
            selectedYear: year,
            fromDate,
            toDate
        });

    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.redirect('/admin/error-page');
    }
};

// filter dashboard
const filterDashboard = async (req, res) => {

    try {
        const { fromDate, toDate, month, year, filterType } = req.query

        // base matchStage
        const baseMatchStage = {
            payment_status: { $ne: 'failed' }
        }

        // date and month filter
        if (fromDate && toDate) {
            baseMatchStage.order_date = {
                $gte: new Date(fromDate),
                $lte: new Date(toDate)
            }
        } else if (month && year) {
            baseMatchStage.$expr = {
                $and: [
                    { $eq: [{ $month: '$order_date' }, parseInt(month)] },
                    { $eq: [{ $year: '$order_date' }, parseInt(year)] }
                ]
            }
        } else if (month && !year) {
            baseMatchStage.$expr = {
                $eq: [{ $month: '$order_date' }, parseInt(month)]
            }
        } else if (year && !month) {
            baseMatchStage.$expr = {
                $eq: [{ $year: '$order_date' }, parseInt(year)]
            }
        }

        // determine grouping based on filter type
        let groupingStage;

        if (filterType === 'weekly') {    
            groupingStage = {
                $group: {
                    _id: {
                        year: { $isoWeekYear: '$order_date' },
                        week: { $isoWeek: '$order_date' },
                        // get the fist day of the week
                        firstDayOfWeek: {
                            $dateFromParts: {
                                isoWeekYear: { $isoWeekYear: '$order_date' },
                                isoWeek: { $isoWeek: '$order_date' }, 
                                isoDayOfWeek: 1
                            }
                        }
                    },
                    totalSales: {$sum: '$netAmount'},
                    count: {$sum: 1}
                }
            }
        } else if (filterType === 'monthly') {
            groupingStage = {
                $group: {
                    _id: {
                        month: { $month: '$order_date' },
                        year: { $year: '$order_date' }
                    },
                    totalSales: {$sum: '$netAmount'},
                    count: {$sum: 1}
                }
            }
        } else {
            // daily grouping
            groupingStage = {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$order_date' } }
                    },
                    totalSales: {$sum: '$netAmount'},
                    count: {$sum: 1}
                }
            }
        }

        // fetch filter data
        const [totalOrders, totalSales, bestSellingProducts, bestSellingCategories, timeSeriesData] = await Promise.all([
            Order.countDocuments(baseMatchStage),
            Order.aggregate([
                { $match: baseMatchStage },
                {
                    $group: {
                        _id: null,
                        totalSales: { $sum: '$netAmount' }
                    }
                }
            ]),
            // best selling products
            Order.aggregate([
                { $match: baseMatchStage },
                {
                    $lookup: {
                        from: 'orderitems',
                        localField: '_id',
                        foreignField: 'order_id',
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
            ]),
            // best selling categories
            Order.aggregate([
                { $match: baseMatchStage },
                {
                    $lookup: {
                        from: 'orderitems',
                        localField: '_id',
                        foreignField: 'order_id',
                        as: 'orderItems'
                    }
                },
                { $unwind: '$orderItems' },
                { $unwind: '$orderItems.items' },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'orderItems.items.product_id',
                        foreignField: '_id',
                        as: 'productDetails'
                    }
                },
                { $unwind: '$productDetails' },
                {
                    $group: {
                        _id: '$productDetails.category_id',
                        totalQuantity: { $sum: '$orderItems.items.quantity' }
                    }
                },
                {
                    $lookup: {
                        from: 'categories',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'categoryDetails'
                    }
                },
                {$unwind: '$categoryDetails'},
                {$sort: {totalQuantity: -1}},
                {$limit: 10}
            ]),

            // time series data
            Order.aggregate([
                { $match: baseMatchStage },
                groupingStage,
                { $sort: filterType === 'weekly' ? { '_id.year': 1, '_id.week': 1 } : { '_id': 1 } }
            ])
        ])

        // Process weekly sales data for chart
        const chartData = timeSeriesData.reduce((acc, item) => {
            let label;
            if (filterType === 'weekly') {
                const startDate = new Date(item._id.firstDayOfWeek);
                const endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                label = `${startDate.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('default', { month: 'short', day: 'numeric' })}`;
            } else if (filterType === 'monthly') {
                label = new Date(item._id.year, item._id.month - 1).toLocaleDateString('default', { month: 'long', year: 'numeric' });
            } else {
                label = new Date(item._id.date).toLocaleDateString('default', { month: 'short', day: 'numeric' });
            }

            return {
                labels: [...acc.labels, label],
                data: [...acc.data, item.totalSales]
            };
        }, { labels: [], data: [] });


        // Send JSON response
        res.json({
            totalOrders,
            totalSales: totalSales[0]?.totalSales || 0,
            bestSellingProducts,
            bestSellingCategories,
            salesData: chartData
        });

    } catch (error) {
        console.error('Error fetching filtered data:', error);
        res.status(500).json({ error: 'Internal server error' });
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
    filterDashboard,
    // getGraph,
}