const Order = require('../../models/orderSchema')
const OrderItems = require('../../models/orderItemsSchema')
const User = require('../../models/userSchema')


const loadSales = async (req, res) => {
    try {
        if (req.session.admin) {
            const page = parseInt(req.query.page) || 1
            const limit = 8
            const skip = (page - 1) * limit

            //extract filter parmas
            const { fromDate, toDate, month, year } = req.query;

            // Fetch data for total users, orders, and sales

            const pipeline = [
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
                        payment_status: 1,
                        'user.first_name': 1,
                        'user.email': 1,
                        'address.city': 1,
                        'address.pincode': 1,
                        'payment.status': 1,
                        'payment.transaction_id': 1,
                        'orderItems.items': 1,
                        productDetails: { title: 1 },
                        orderMonth: { $month: '$order_date' },
                        orderYear: { $year: '$order_date' },
                        
                    }
                },
                
            ];

            // add filter to the pipeline
            const matchStage = {
                payment_status: { $ne: 'failed'}
            }
            if (month && !isNaN(month)) {
                matchStage.orderMonth = parseInt(month);
            }
            if (year && !isNaN(year)) {
                matchStage.orderYear = parseInt(year);
            }

            //date range filter
            if(fromDate && toDate) {
                matchStage.order_date = {
                    $gte: new Date(fromDate),
                    $lte: new Date(toDate)
                }
            }

            if(Object.keys(matchStage).length > 0) {
                pipeline.push({$match: matchStage})
            }

            // Sort and final aggregation
            pipeline.push(
                { $sort: { order_date: -1 } },
                { $skip: skip },
                { $limit: limit }
            );

             // Get total items after applying filters
             const totalItemsPipeline = [
                { $match: matchStage }, // Apply the same filters for counting
                { $count: 'totalItems' },
            ];
            const totalItemsResult = await Order.aggregate(totalItemsPipeline);
            const totalItems = totalItemsResult[0]?.totalItems || 0;
            const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;

            //fetch data
            const [totalUsers, totalOrders, totalSales, salesReport] = await Promise.all([
                User.countDocuments(),
                Order.countDocuments({ payment_status: { $ne: 'failed' } }),
                Order.aggregate([
                    { $match: { payment_status: { $ne: 'failed' } } },
                    { $group: { _id:null, totalSales: {$sum: '$netAmount'}}}
                ]),
                Order.aggregate(pipeline)
            ])

            // Render the sales page with the fetched data
            res.render('salesReport', {
                totalUsers,
                totalOrders,
                salesReport: salesReport || [],
                totalSales: totalSales[0]?.totalSales || 0,
                currentPage: page,
                itemsPerPage: limit,
                totalPages,
                // selectedStatus: status,
                selectedMonth: month,
                selectedYear: year,
                fromDate,
                toDate
            })
        } else {
            return res.redirect('/admin/login') // Redirect if no admin session
        }
    } catch (error) {
        console.error('error loadin dashboard', error)
        res.redirect('/admin/error-page')
    }
}

//get all sales data for downloading pdf
const getAllSalesData = async(req,res) => {
    try {

        if(req.session.admin) {

            const { fromDate, toDate, month, year } = req.body;

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
                        from: 'payments',
                        localField: 'payment_id',
                        foreignField: '_id',
                        as: 'payment'
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
                    $match: {
                        payment_status: { $ne: 'failed' }
                    }
                },
                {
                    $unwind: { path: '$orderItems', preserveNullAndEmptyArrays: true }
                },
                {
                    $unwind: { path: '$user', preserveNullAndEmptyArrays: true }
                },
                {
                    $unwind: { path: '$payment', preserveNullAndEmptyArrays: true }
                },
                {
                    $unwind: { path: '$address', preserveNullAndEmptyArrays: true }
                },
                {
                    $project: {
                        orderDate: { $dateToString: { format: "%Y-%m-%d", date: "$order_date" } },
                        order_date: 1,
                        customer: { $concat: ["$user.first_name", " (", "$user.email", ")"] },
                        products: "$productDetails.title", 
                        quantity: { $size: "$orderItems.items" },
                        totalAmount: "$total",
                        discount: "$discount",
                        netAmount: "$netAmount",
                        orderItems: 1,
                        status: "$orderItems.items.status",
                        orderMonth: { $month: '$order_date' },
                        orderYear: { $year: '$order_date' }
                    }
                },  
            ];
    
            // Add filters to the pipeline
            const matchStage = {};
            if (month && !isNaN(month)) {
                matchStage.orderMonth = parseInt(month);
            }
            if (year && !isNaN(year)) {
                matchStage.orderYear = parseInt(year);
            }
            if (fromDate && toDate) {
                matchStage.order_date = {
                    $gte: new Date(fromDate),
                    $lte: new Date(toDate)
                };
            }
    
            if (Object.keys(matchStage).length > 0) {
                pipeline.push({ $match: matchStage });
            }
    
            // Sort by order date
            pipeline.push({ $sort: { order_date: -1 } });
    
            // Execute the aggregation
            const salesReport = await Order.aggregate(pipeline);
    
            // Calculate totals
            const totals = {
                totalOrders: salesReport.length,
                totalAmount: salesReport.reduce((sum, order) => sum + order.netAmount, 0),
                totalDiscount: salesReport.reduce((sum, order) => sum + order.discount, 0)
            };
    
            res.json({
                success: true,
                data: salesReport,
                totals
            });
        } else {
            return res.redirect('/admin/login')
        }
    } catch (error) {
        console.log('error geting the all sales',error)
        res.status(500).json({
            success: false,
            error: 'Error generating sales report'
        });
    }
}

module.exports = {
    loadSales,
    getAllSalesData,
}