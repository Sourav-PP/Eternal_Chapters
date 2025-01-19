const payment = require('../../models/paymentSchema')
const transaction = require('../../models/transactionSchema')
const Wallet = require('../../models/walletSchema')
const WalletTransaction = require('../../models/walletTransactionSchema')
const walletTransaction = require('../../models/walletTransactionSchema')
const Razorpay = require('razorpay')
const env = require('dotenv').config()

//initialize rezorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
})

const createOrder = async (req, res) => {
    try {
        const {amount} = req.body

        const options = {
            amount: amount * 100, // amount in the smallest currency unit
            currency: "INR",
            receipt: req.body.receipt,
            payment_capture: 1
        };

        const order = await razorpay.orders.create(options);
        res.status(200).json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency
        });
    } catch (error) {
        console.log('error in the createOrder',error)
        res.status(500).json({ error: error.message });
    }
};

//create wallet order
const createWalletOrder = async(req,res) => {
    try {
        const {amount} = req.body

        const razorpayOrder = await razorpay.orders.create({
            amount, 
            currency: 'INR',
            receipt: `wallet_${Date.now()}`
        });

        res.json({ success: true, order_id: razorpayOrder.id, amount: razorpayOrder.amount, currency: razorpayOrder.currency })
    } catch (error) {
        console.log('error in creating wallet',error)
        res.status(500).json({ success: false, error: error.message });
    }
    
}

module.exports = {
    createOrder,
    createWalletOrder,
};

