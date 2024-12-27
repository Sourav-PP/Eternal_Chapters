const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userController')
const validateSignup = require('../middlewares/validateSignup')
const validateOtpInput = require('../middlewares/validateOtp')


router.get('/404', userController.page_404)

router.get('/', userController.loadHomepage)
router.get('/signup', userController.loadSignup)
router.post('/signup', validateSignup, userController.signup)

router.get('/login',userController.loadLogin)

router.post('/verify-otp',validateOtpInput,userController.verifyOtp)



module.exports = router