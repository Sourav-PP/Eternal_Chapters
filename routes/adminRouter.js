const express = require('express')
const router = express.Router()
const adminController = require('../controllers/admin/adminController')
const customerController = require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController')
const productController = require('../controllers/admin/productController')
const bannerController = require('../controllers/admin/bannerController')
const validateAdminSignin = require('../middlewares/validateAdminSignin')
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
router.get('/', adminAuth, adminController.loadDashboard)
router.get('/logout', adminController.logout)

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
router.post('/add-product', adminAuth, upload.array('product_images', 4), productController.addProduct)
router.post('/soft-deleteProduct/:id', adminAuth, productController.softDeleteProduct)
router.post('/restoreProduct/:id', adminAuth, productController.restoreProduct)
router.get('/editProduct',adminAuth,productController.getEditProduct)
router.post('/edit-product/:id',adminAuth,upload.array('product_images', 4), productController.editProduct)
router.post('/deleteProduct/:id',adminAuth, productController.deleteProduct)

//banner management
router.get('/banners', adminAuth, bannerController.getBannerPage)
router.post('/addBanner', adminAuth, upload.single('image'), bannerController.addBanner)

module.exports = router