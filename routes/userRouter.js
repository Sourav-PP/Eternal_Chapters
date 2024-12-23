const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')


router.get('/404',userController.page_404)
router.get('/',userController.loadHomepage)


module.exports = router