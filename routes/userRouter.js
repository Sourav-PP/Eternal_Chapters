const express = require('express')
const router = express.Router()
const cartController = require('../controllers/user/cartController')
const categoryController = require('../controllers/user/categoryController')
const orderController = require('../controllers/user/orderController')
const userController = require('../controllers/user/userController')
const productController = require('../controllers/user/productController')
const profileController = require('../controllers/user/profileController')
const wishlistController = require('../controllers/user/wishlistController')
const paymentController = require('../controllers/user/paymentController')
const walletController = require('../controllers/user/walletController')
//validation
const validateSignup = require('../middlewares/validateSignup')
const validateSignin = require('../middlewares/validateSignin')
const validateAddAddress = require('../middlewares/validateAddAddress')
const validateUpdateProfile = require('../middlewares/validateUpdateProfile')
const validateOtpInput = require('../middlewares/validateOtp')
const { userAuth, adminAuth } = require('../middlewares/auth')





router.get('/404', userController.page_404)
router.get('/', userAuth, userController.loadHomepage)
router.get('/signup', userController.loadSignup)
router.post('/signup', validateSignup, userController.signup)

//login management  
router.get('/login', userController.loadLogin)
router.post('/login', validateSignin, userController.login)
router.get('/verify-otp', userController.getOtpPage)
router.post('/verify-otp', validateOtpInput, userController.verifyOtp)
router.post('/resend-signup-otp', userController.resendSignupOtp)
router.get('/logout', userController.logout)

//blocked user page
router.get('/blocked', userController.blockedUser)

//profile management
router.get('/forgot-password', profileController.getForgotpage)
router.post('/forgot-password', profileController.forgotPassword)
router.post('/verify-forgotPass-otp', validateOtpInput, profileController.verifyForgotPassOtp)
router.post('/resend-forgot-otp', validateOtpInput, profileController.resendOtp)
router.get('/reset-password', profileController.getResetPassword)
router.post('/reset-password', profileController.resetPassword)
router.get('/userProfile', userAuth, profileController.userProfile)
router.post('/updateProfile', userAuth,validateUpdateProfile, profileController.updateProfile) //update profile

//address management
router.get('/addressManagent', userAuth, profileController.manageAddress)
router.get('/addAddress', userAuth, profileController.getAddAddress)
router.post('/addAddress', userAuth, validateAddAddress, profileController.addAddress)
router.get('/editAddress/:id', userAuth, profileController.getEditAddress)
router.post('/editAddress/:id', userAuth,validateAddAddress, profileController.editAddress)
router.post('/deleteAdress/:id', userAuth, profileController.deleteAddress)

//product management
router.get('/productDetails', userAuth, productController.getProductDetails)

//cart management
router.get('/cart-page', userAuth, cartController.getCartPage)
router.post('/addCart', userAuth, cartController.addToCart)
router.post('/remove-cart-product/:id', userAuth, cartController.removeProduct)
router.post('/update-cart', userAuth, cartController.updateCart)

//wishlist
router.get('/wishlist', userAuth, wishlistController.getWishlist)
router.post('/wishlist', userAuth, wishlistController.wishlist)
router.post('/remove-wishlist/:id', userAuth, wishlistController.remove)

//order management
router.get('/checkout', userAuth, orderController.checkout)
router.post('/get-delivery-charges', userAuth, orderController.getDeliveryCharges)
router.post('/get-wallet-balance', userAuth, orderController.getWalletBalance)
router.post('/place-order', userAuth, orderController.placeOrder)
router.post ('/update-payment-status', userAuth, orderController.updatePaymentStatus)
router.get('/success-page',userAuth, orderController.success)
router.get('/order-history', userAuth, orderController.orderHistory)
router.get('/retry-payment/:id', userAuth, orderController.retryPayment)
router.post('/cancel-order/:id/:productId', userAuth, orderController.cancelOrder)
router.post('/return-order/:id/:productId', userAuth, orderController.returnOrder)
router.post('/apply-coupon', userAuth, orderController.applyCoupon)
router.post('/remove-coupon', userAuth, orderController.removeCoupon)
router.get('/invoice/download/:id', userAuth, orderController.generateInvoice)

//payment management
router.post('/create-order', userAuth, paymentController.createOrder)
router.post('/create-wallet-order', userAuth, paymentController.createWalletOrder)

//wallet management
router.get('/wallet-page', userAuth, walletController.getWallet)
router.post('/update-wallet', userAuth, walletController.updateWallet)
router.get('/wallet-transction-history', userAuth, walletController.getHistory)

//category
router.get('/category/:id', userAuth, categoryController.categoryPage)




module.exports = router