const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userController')
const validateSignup = require('../middlewares/validateSignup')
const validateSignin = require('../middlewares/validateSignin')
const validateOtpInput = require('../middlewares/validateOtp')
const { userAuth, adminAuth } = require('../middlewares/auth')
const productController = require('../controllers/user/productController')
const profileController = require('../controllers/user/profileController')
const validateAddAddress = require('../middlewares/validateAddAddress')
const cartController = require('../controllers/user/cartController')
const categoryController = require('../controllers/user/categoryController')
const orderController = require('../controllers/user/orderController')  



router.get('/404', userController.page_404)
router.get('/', userAuth, userController.loadHomepage)
router.get('/signup', userController.loadSignup)
router.post('/signup', validateSignup, userController.signup)

//login management  
router.get('/login', userController.loadLogin)
router.post('/login', validateSignin, userController.login)
router.get('/verify-otp', userController.getOtpPage)
router.post('/verify-otp', validateOtpInput, userController.verifyOtp)
router.get('/logout', userController.logout)

//blocked user page
router.get('/blocked', userController.blockedUser)

//profile management
router.get('/forgot-password', profileController.getForgotpage)
router.post('/forgot-password', profileController.forgotPassword)
router.post('/verify-forgotPass-otp', profileController.verifyForgotPassOtp)
router.post('/resend-forgot-otp', profileController.resendOtp)
router.get('/reset-password', profileController.getResetPassword)
router.post('/reset-password', profileController.resetPassword)
router.get('/userProfile', userAuth, profileController.userProfile)
router.post('/updateProfile',userAuth, profileController.updateProfile)

//address management
router.get('/addressManagent', userAuth, profileController.manageAddress)
router.get('/addAddress', userAuth, profileController.getAddAddress)
router.post('/addAddress', userAuth, validateAddAddress, profileController.addAddress)
router.get('/editAddress/:id',userAuth, profileController.getEditAddress)
router.post('/editAddress/:id',userAuth, profileController.editAddress)
router.post('/deleteAdress/:id',userAuth,profileController.deleteAddress)

//product management
router.get('/productDetails', userAuth, productController.getProductDetails)

//cart management
router.get('/cart-page',userAuth,cartController.getCartPage)
router.post('/addCart',userAuth,cartController.addToCart)
router.post('/remove-cart-product/:id', userAuth, cartController.removeProduct)
router.post('/update-cart', userAuth, cartController.updateCart)

//order management
router.get('/checkout',userAuth, orderController.checkout)
router.post('/place-order',userAuth, orderController.placeOrder)
router.get('/order-history',userAuth, orderController.orderHistory)
router.post('/cancel-order/:id',userAuth, orderController.cancelOrder )

//category
router.get('/romance/:id',userAuth, categoryController.romance)

//filter product
router.get('/filter',userAuth,productController.filterProduct)




module.exports = router