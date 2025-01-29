const {body} = require("express-validator")


const createOfferValidation = [
    body('name')
        .notEmpty().withMessage('Offer name is required')
        .isString().withMessage('Offer name must be a string'),
    
    body('offer_type')
        .notEmpty().withMessage('Offer type is required')
        .isIn(['product', 'category', 'referral']).withMessage('Invalid offer type'),

    body('discount_value')
        .notEmpty().withMessage('Discount value is required')
        .isNumeric().withMessage('Discount value must be a number')
        .isInt({ min: 1, max: 100 }).withMessage('Discount value must be between 1 and 100'),

    body('start_date')
        .notEmpty().withMessage('Start date is required')
        .isISO8601().withMessage('Invalid start date'),

    body('end_date')
        .notEmpty().withMessage('End date is required')
        .isISO8601().withMessage('Invalid end date')
        .custom((value, { req }) => {
            if (new Date(value) <= new Date(req.body.start_date)) {
                throw new Error('End date must be after start date');
            }
            return true;
        }),

    body('status')
        .optional()
        .isIn(['active', 'inactive']).withMessage('Invalid status')
];

module.exports = createOfferValidation;