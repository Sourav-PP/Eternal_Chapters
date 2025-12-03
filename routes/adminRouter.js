const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerController');
const categoryController = require('../controllers/admin/categoryController');
const productController = require('../controllers/admin/productController');
const bannerController = require('../controllers/admin/bannerController');
const orderController = require('../controllers/admin/orderController');
const couponController = require('../controllers/admin/couponController');
const offerController = require('../controllers/admin/offerController');
const salesController = require('../controllers/admin/salesController');
//validation
const validateAdminSignin = require('../middlewares/validateAdminSignin');
const validateAddProduct = require('../middlewares/validateAddProduct');
const validateEditProduct = require('../middlewares/validateEditProduct');
const validateCoupon = require('../middlewares/validateCoupon');
const validateCreateOffer = require('../middlewares/validateCreateOffer');
const { adminAuth } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authRoutes = require('../constants/routeConsts/authRoutes');
const adminRoutes = require('../constants/routeConsts/adminRoutes');

//configure multer for image upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage });

router.get(adminRoutes.pageError, adminController.pageError);
router.get(authRoutes.login, adminController.loadLogin);
router.post(authRoutes.login, validateAdminSignin, adminController.login);
router.get(authRoutes.logout, adminController.logout);
router.get(adminRoutes.dashboard, adminAuth, adminController.loadDashboard);
router.get(adminRoutes.dashboardFilters, adminAuth, adminController.filterDashboard);

//customer management
router.get(adminRoutes.customers, adminAuth, customerController.customerInfo);
router.post(adminRoutes.updateStatus, adminAuth, customerController.updateStatus);
router.post(adminRoutes.addUser, adminAuth, customerController.addUser);
router.post(adminRoutes.deleteUser, adminAuth, customerController.deleteUser);
router.post(adminRoutes.editUser, adminAuth, customerController.editUser);

//category management
router.get(adminRoutes.categories, adminAuth, categoryController.categoryInfo);
router.post(adminRoutes.addCategory, adminAuth, categoryController.addCategory);
router.post(adminRoutes.editCategory, adminAuth, categoryController.editCategory);
router.post(adminRoutes.softDelete, adminAuth, categoryController.softDelete);
router.post(adminRoutes.restoreCategory, adminAuth, categoryController.restoreCategory);
router.post(adminRoutes.deleteCategory, adminAuth, categoryController.deleteCategory);

// Product management
router.get(adminRoutes.products, adminAuth, productController.productInfo);
router.get(adminRoutes.addProduct, adminAuth, productController.getAddProduct);
router.post(
    adminRoutes.addProductPost,
    adminAuth,
    upload.array('product_images', 4),
    validateAddProduct,
    productController.addProduct,
);
router.post(adminRoutes.softDeleteProduct, adminAuth, productController.softDeleteProduct);
router.post(adminRoutes.restoreProduct, adminAuth, productController.restoreProduct);
router.get(adminRoutes.editProduct, adminAuth, productController.getEditProduct);
router.post(
    adminRoutes.editProductPost,
    adminAuth,
    upload.array('product_images', 4),
    validateEditProduct,
    productController.editProduct,
);
router.post(adminRoutes.deleteProduct, adminAuth, productController.deleteProduct);

//order management
router.get(adminRoutes.orders, adminAuth, orderController.getOrders);
router.post(adminRoutes.updateOrderStatus, adminAuth, orderController.updateOrderStatus);
router.post(adminRoutes.approveReturn, adminAuth, orderController.approveReturn);
router.post(adminRoutes.rejectReturn, adminAuth, orderController.rejectReturn);

//sales management
router.get(adminRoutes.salesReport, adminAuth, salesController.loadSales);
router.post(adminRoutes.allSales, adminAuth, salesController.getAllSalesData);

//coupon management
router.get(adminRoutes.coupon, adminAuth, couponController.getPage);
router.post(adminRoutes.createCoupon, adminAuth, validateCoupon, couponController.createCoupon);
router.post(adminRoutes.editCoupon, adminAuth, couponController.editCoupon);
router.post(adminRoutes.deleteCoupon, adminAuth, couponController.deleteCoupon);

//offer management
router.get(adminRoutes.offerManagement, adminAuth, offerController.getOfferManagement);
router.get(adminRoutes.createOffer, adminAuth, offerController.getCreateOffer);
router.post(adminRoutes.createOffer, adminAuth, validateCreateOffer, offerController.createOffer);
router.get(adminRoutes.editOffer, adminAuth, offerController.getEditOffer);
router.post(adminRoutes.editOffer, adminAuth, validateCreateOffer, offerController.editOffer);
router.post(adminRoutes.deleteOffer, adminAuth, offerController.deleteOffer);
router.get(adminRoutes.addOfferProduct, adminAuth, offerController.getAddOfferProduct);
router.post(adminRoutes.applyOfferProduct, adminAuth, offerController.applyOfferProduct);
router.get(adminRoutes.removeOfferProduct, adminAuth, offerController.removeOfferProduct);
router.get(adminRoutes.addOfferCategory, adminAuth, offerController.getAddOfferCategory);
router.post(adminRoutes.applyOfferCategory, adminAuth, offerController.applyOfferCategory);
router.get(adminRoutes.removeOfferCategory, adminAuth, offerController.removeOfferCategory);

//banner management
router.get(adminRoutes.bannerPage, adminAuth, bannerController.getBannerPage);
router.post(adminRoutes.addBanner, adminAuth, upload.single('image'), bannerController.addBanner);
router.get(adminRoutes.deleteBanner, adminAuth, bannerController.deleteBanner);

module.exports = router;
