const Wallet = require('../../models/walletSchema')
const WalletTransaction = require('../../models/walletTransactionSchema')
const User = require('../../models/userSchema')
const crypto = require('crypto');

const getWallet = async(req,res) => {
    try {
        const userId = req.session.user
        const wallet = await Wallet.findOne({user_id: userId})

        const user = await User.findById(userId)
        console.log('wallet', wallet)

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

module.exports = {
    getWallet,
    updateWallet,
}