const express = require('express')
const router = express.Router()
const adminController = require('../controllers/admin/adminController')
const customerController = require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController')
const productController = require('../controllers/admin/productController')
const bannerController = require('../controllers/admin/bannerController')
const { userAuth, adminAuth } = require('../middlewares/auth')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

//configure multer for image upload
const storage = multer.diskStorage({
    destination: function(req,file,cb) {
        const uploadPath = path.join(__dirname,'../uploads')
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath)
    },
    filename: function(req,file,cb) {
        cb(null, `${Date.now()}-${file.originalname}`)
    }
})

const upload = multer({storage})


router.get('/page-error',adminController.pageError)
router.get('/login', adminController.loadLogin)
router.post('/login', adminController.login)
router.get('/', adminAuth, adminController.loadDashboard)
router.get('/logout',adminController.logout)

//customer management
router.get('/users',adminAuth, customerController.customerInfo)
router.post('/update-status',adminAuth, customerController.updateStatus)
//add user
router.post('/add-user',adminAuth,customerController.addUser)
router.post('/deleteUser/:id',customerController.deleteUser)

//category management
router.get('/categories',adminAuth,categoryController.categoryInfo)
//add category
router.post('/addCategory',adminAuth,categoryController.addCategory)
router.post('/editCategory',adminAuth,categoryController.editCategory)
//soft delete category
router.post('/soft-delete/:id',adminAuth,categoryController.softDelete)
router.post('/restoreCategory/:id',adminAuth,categoryController.restoreCategory)

// Product management
router.get('/products',adminAuth,productController.productInfo)
router.get('/addProduct',adminAuth,productController.getAddProduct)
router.post('/add-product',adminAuth,upload.array('product_images',4),productController.addProduct)

//banner management
router.get('/banners',adminAuth,bannerController.getBannerPage)
router.post('/addBanner',adminAuth, upload.single('banner_img'),bannerController.addBanner)

module.exports = router