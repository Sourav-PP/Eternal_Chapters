const express = require('express')
const router = express.Router()
const adminController = require('../controllers/admin/adminController')
const customerController = require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController')
const productController = require('../controllers/admin/productController')
const bannerController = require('../controllers/admin/bannerController')
const orderController = require('../controllers/admin/orderController')
const couponController = require('../controllers/admin/couponController')
const offerController = require('../controllers/admin/offerController')
const salesController = require('../controllers/admin/salesController')
//validation
const validateAdminSignin = require('../middlewares/validateAdminSignin')
const validateAddProduct = require('../middlewares/validateAddProduct')
const validateEditProduct = require('../middlewares/validateEditProduct')
const validateCoupon = require('../middlewares/validateCoupon')
const validateCreateOffer = require('../middlewares/validateCreateOffer')
const { userAuth, adminAuth } = require('../middlewares/auth')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

//configure multer for image upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads')
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath)
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`)
    }
})

const upload = multer({ storage })


router.get('/page-error', adminController.pageError)
router.get('/login', adminController.loadLogin)
router.post('/login',validateAdminSignin, adminController.login)
router.get('/logout', adminController.logout)
router.get('/', adminAuth, adminController.loadDashboard)

//customer management
router.get('/users', adminAuth, customerController.customerInfo)
router.post('/update-status', adminAuth, customerController.updateStatus)
router.post('/add-user', adminAuth, customerController.addUser)
router.post('/deleteUser/:id',adminAuth, customerController.deleteUser)
router.post('/editUser',adminAuth,customerController.editUser)

//category management
router.get('/categories', adminAuth, categoryController.categoryInfo)
router.post('/addCategory', adminAuth, categoryController.addCategory)
router.post('/editCategory', adminAuth, categoryController.editCategory)
router.post('/soft-delete/:id', adminAuth, categoryController.softDelete)
router.post('/restoreCategory/:id', adminAuth, categoryController.restoreCategory)
router.post('/deleteCategory/:id',adminAuth,categoryController.deleteCategory)

// Product management
router.get('/products', adminAuth, productController.productInfo)
router.get('/addProduct', adminAuth, productController.getAddProduct)
router.post('/add-product', adminAuth, upload.array('product_images', 4), validateAddProduct, productController.addProduct)
router.post('/soft-deleteProduct/:id', adminAuth, productController.softDeleteProduct)
router.post('/restoreProduct/:id', adminAuth, productController.restoreProduct)
router.get('/editProduct',adminAuth,productController.getEditProduct)
router.post('/edit-product/:id',adminAuth,upload.array('product_images', 4), validateEditProduct, productController.editProduct)
router.post('/deleteProduct/:id',adminAuth, productController.deleteProduct)

//order management
router.get('/orders', adminAuth, orderController.getOrders)
router.post('/update-order-status/:orderId/:productId', adminAuth, orderController.updateOrderStatus)
router.post('/approve-return/:orderId/:productId', adminAuth, orderController.approveReturn)
router.post('/reject-return/:orderId/:productId', adminAuth, orderController.rejectReturn)

//sales management
router.get('/sales-report', adminAuth, salesController.loadSales)

//coupon management
router.get('/coupon-page', adminAuth, couponController.getPage)
router.post('/create-coupon', adminAuth, validateCoupon, couponController.createCoupon)
router.post('/edit-coupon', adminAuth, couponController.editCoupon)
router.post('/delete-coupon', adminAuth, couponController.deleteCoupon)

//offer management
router.get('/offer-management', adminAuth, offerController.getOfferManagement)
router.get('/create-offer', adminAuth, offerController.getCreateOffer)
router.post('/create-offer', adminAuth,validateCreateOffer, offerController.createOffer)
router.get('/edit-offer/:id', adminAuth, offerController.getEditOffer)
router.post('/edit-offer/:id', adminAuth,validateCreateOffer, offerController.editOffer)
router.post('/delete-offer', adminAuth, offerController.deleteOffer )
router.get('/add-offer-product', adminAuth, offerController.getAddOfferProduct)
router.post('/apply-offer-product', adminAuth, offerController.applyOfferProduct)
router.get('/remove-offer-product', adminAuth, offerController.removeOfferProduct)
router.get('/add-offer-category', adminAuth, offerController.getAddOfferCategory)
router.post('/apply-offer-category',adminAuth, offerController.applyOfferCategory)
router.get('/remove-offer-category', adminAuth, offerController.removeOfferCategory)

//banner management
router.get('/banners', adminAuth, bannerController.getBannerPage)
router.post('/addBanner', adminAuth, upload.single('image'), bannerController.addBanner)

module.exports = router