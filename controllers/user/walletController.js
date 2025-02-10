const Wallet = require('../../models/walletSchema')
const WalletTransaction = require('../../models/walletTransactionSchema')
const User = require('../../models/userSchema')
const crypto = require('crypto');

const getWallet = async(req,res) => {
    try {
        const userId = req.session.user
        const wallet = await Wallet.findOne({user_id: userId})

        const user = await User.findById(userId)

        return res.render('wallet', {
            success: [],
            wallet,
            user
        })
    } catch (error) {
        console.log('error loading the wallet page',error)
        return res.redirect('/userProfile')
    }
}

//update the wallet
const updateWallet = async(req,res) => {
    try {
        const {paymentId, orderId, signature, wallet_id, amount, transaction_type} = req.body

        //Verify the payment signature
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(orderId + '|' + paymentId);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature !== signature) {
            return res.status(400).json({ success: false, error: 'Invalid signature' });
        }

        const userId = req.session.user
        const wallet = await Wallet.findOne({user_id: userId})

        if (!wallet) {
            return res.status(404).json({ success: false, error: 'Wallet not found' });
        }

        const amountInRupees = parseFloat(amount) / 100
        wallet.balance += amountInRupees
        await wallet.save();

        const newTransaction = new WalletTransaction({
            wallet_id,
            amount: amountInRupees,
            transaction_type,
            balance_after_transaction: wallet.balance,  // New balance after the transaction
            payment_status: 'successful'
        });

        await newTransaction.save();

        res.json({ success: true, newBalance: wallet.balance });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

//transction history
const getHistory = async(req,res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = 10
        const skip = (page - 1) * limit

        const userId = req.session.user
        const userData = await User.findById(userId)
        const wallet = await Wallet.findOne({user_id: userId})

        //extract filter adn sorts
        const {dateFilter, sortBy} = req.query;
        let query = {wallet_id: wallet._id}

        //filter by date
        if(dateFilter) {
            const date = new Date(dateFilter)
            const nextDay = new Date(date)
            nextDay.setDate(nextDay.getDate() + 1) 
            query.created_at = {
                $gte: date,
                $lt: nextDay
            }
        }

        //sorting order
        let sort = {created_at: -1}
        if(sortBy === 'date_asc') {
            sort = {created_at: 1}
        }else if (sortBy === 'amount_desc') {
            sort = {amount: -1}
        }else if (sortBy === 'amount_asc') {
            sort = {amount: 1}
        }
    
        const walletTransaction = await WalletTransaction.find(query).sort(sort).skip(skip).limit(limit)
        const totalTransactions = await WalletTransaction.countDocuments({wallet_id: wallet._id});
        const totalPages = Math.ceil(totalTransactions / limit);

        return res.render('walletTransactionHistory', {
            user: userData,
            walletTransaction,
            currentPage: page,
            itemsPerPage: limit,
            totalPages,
            dateFilter,
            sortBy,
        })
    } catch (error) {
        console.log('error loading wallet history page',error)
    }
}




module.exports = {
    getWallet,
    updateWallet,
    getHistory,
}