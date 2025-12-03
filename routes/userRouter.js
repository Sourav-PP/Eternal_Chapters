const express = require('express');
const router = express.Router();
const cartController = require('../controllers/user/cartController');
const categoryController = require('../controllers/user/categoryController');
const orderController = require('../controllers/user/orderController');
const userController = require('../controllers/user/userController');
const productController = require('../controllers/user/productController');
const profileController = require('../controllers/user/profileController');
const wishlistController = require('../controllers/user/wishlistController');
const paymentController = require('../controllers/user/paymentController');
const walletController = require('../controllers/user/walletController');
//validation
const validateSignup = require('../middlewares/validateSignup');
const validateSignin = require('../middlewares/validateSignin');
const validateAddAddress = require('../middlewares/validateAddAddress');
const validateUpdateProfile = require('../middlewares/validateUpdateProfile');
const validateOtpInput = require('../middlewares/validateOtp');
const { userAuth } = require('../middlewares/auth');
const userRoutes = require('../constants/routeConsts/userRoutes');
const authRoutes = require('../constants/routeConsts/authRoutes');

router.get(userRoutes.notFound, userController.page_404);
router.get(userRoutes.base, userAuth, userController.loadHomepage);
router.get(authRoutes.signup, userController.loadSignup);
router.post(authRoutes.signup, validateSignup, userController.signup);

//login management
router.get(authRoutes.login, userController.loadLogin);
router.post(authRoutes.login, validateSignin, userController.login);
router.get(authRoutes.verifyOtp, userController.getOtpPage);
router.post(authRoutes.verifyOtp, validateOtpInput, userController.verifyOtp);
router.post(authRoutes.resendSignupOtp, userController.resendSignupOtp);
router.get(authRoutes.logout, userController.logout);

//blocked user page
router.get(userRoutes.blockedPage, userController.blockedUser);

//profile management
router.get(authRoutes.forgotPassword, profileController.getForgotPage);
router.post(authRoutes.forgotPassword, profileController.forgotPassword);
router.post(authRoutes.verifyForgotPassOtp, validateOtpInput, profileController.verifyForgotPassOtp);
router.post(authRoutes.resendForgotPassOtp, validateOtpInput, profileController.resendOtp);
router.get(authRoutes.resetPassword, profileController.getResetPassword);
router.post(authRoutes.resetPassword, profileController.resetPassword);
router.get(userRoutes.profile, userAuth, profileController.userProfile);
router.post(userRoutes.updateProfile, userAuth, validateUpdateProfile, profileController.updateProfile); //update profile

//address management
router.get(userRoutes.addressManagement, userAuth, profileController.manageAddress);
router.get(userRoutes.addAddress, userAuth, profileController.getAddAddress);
router.post(userRoutes.addAddress, userAuth, validateAddAddress, profileController.addAddress);
router.get(userRoutes.editAddress, userAuth, profileController.getEditAddress);
router.post(userRoutes.editAddress, userAuth, validateAddAddress, profileController.editAddress);
router.post(userRoutes.deleteAddress, userAuth, profileController.deleteAddress);

//product management
router.get(userRoutes.productDetails, userAuth, productController.getProductDetails);

//cart management
router.get(userRoutes.cartPage, userAuth, cartController.getCartPage);
router.post(userRoutes.addCart, userAuth, cartController.addToCart);
router.post(userRoutes.removeCartProduct, userAuth, cartController.removeProduct);
router.post(userRoutes.updateCart, userAuth, cartController.updateCart);

//wishlist
router.get(userRoutes.wishlist, userAuth, wishlistController.getWishlist);
router.post(userRoutes.wishlist, userAuth, wishlistController.wishlist);
router.post(userRoutes.removeWishlist, userAuth, wishlistController.remove);

//order management
router.get(userRoutes.checkout, userAuth, orderController.checkout);
router.post(userRoutes.getDeliveryCharges, userAuth, orderController.getDeliveryCharges);
router.post(userRoutes.getWalletBalance, userAuth, orderController.getWalletBalance);
router.post(userRoutes.placeOrder, userAuth, orderController.placeOrder);
router.post(userRoutes.updatePaymentStatus, userAuth, orderController.updatePaymentStatus);
router.get(userRoutes.success, userAuth, orderController.success);
router.get(userRoutes.orderHistory, userAuth, orderController.orderHistory);
router.get(userRoutes.retryPayment, userAuth, orderController.retryPayment);
router.post(userRoutes.cancelOrder, userAuth, orderController.cancelOrder);
router.post(userRoutes.returnOrder, userAuth, orderController.returnOrder);
router.post(userRoutes.applyCoupon, userAuth, orderController.applyCoupon);
router.post(userRoutes.removeCoupon, userAuth, orderController.removeCoupon);
router.get(userRoutes.generateInvoice, userAuth, orderController.generateInvoice);

//payment management
router.post(userRoutes.createOrder, userAuth, paymentController.createOrder);
router.post(userRoutes.createWalletOrder, userAuth, paymentController.createWalletOrder);

//wallet management
router.get(userRoutes.walletPage, userAuth, walletController.getWallet);
router.post(userRoutes.updateWallet, userAuth, walletController.updateWallet);
router.get(userRoutes.walletTransactionHistory, userAuth, walletController.getHistory);

//category
router.get(userRoutes.category, userAuth, categoryController.categoryPage);

module.exports = router;
