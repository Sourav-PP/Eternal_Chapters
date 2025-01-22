const { body } = require('express-validator')
const Coupon = require('../models/couponSchema')

const addCouponValidation = [
    body('code')
        .trim()
        .notEmpty().withMessage('Coupon code is requried')
        .custom(async (value) => {
            const coupon = await Coupon.findOne({ code: value })
            if (coupon) {
                throw new Error('Coupon code must be unique')
            }
            return true
        }),
    body('discount_value')
        .trim()
        .notEmpty().withMessage('Discount value is required')
        .isNumeric().withMessage('Discount value must be a number')
        .custom((value) => {
            if (value <= 0) {
                throw new Error('Discount value must be positive number')
            }
            return true
        }),
    body('coupon_type')
        .notEmpty().withMessage('Coupon type is required.')
        .isIn(['fixed', 'percentage']).withMessage('Invalid coupon type.'),
    body('description')
        .trim()
        .notEmpty().withMessage('Description is required'),
    body('limit')
        .isNumeric().withMessage('Usage limit must be a number.')
        .notEmpty().withMessage('Usage limit is required.')
        .custom((value) => {
            if (value <= 0) {
                throw new Error('Usage limit must be a positive number.');
            }
            return true;
        }),
    body('expiry_date')
        .notEmpty().withMessage('Expiry date is required.')
        .isDate().withMessage('Invalid expiry date.'),
    body('is_active')
        .notEmpty().withMessage('Status selection is required.')
        .isIn(['active', 'inactive']).withMessage('Invalid status.')
]

module.exports = addCouponValidation