const {body} = require("express-validator")

const addAddressValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required.')
        .isLength({ min: 2 }).withMessage('Name must be at least 2 characters long.')
        .matches(/^[A-Za-z\s]+$/).withMessage('Name must contain only letters and spaces.'),
    
    body('pin_code')
        .trim()
        .notEmpty().withMessage('Pincode is required.')
        .isPostalCode('any').withMessage('Invalid pincode.'), // Adjust locale as needed
    
    body('city')
        .trim()
        .notEmpty().withMessage('City is required.')
        .isLength({ min: 2 }).withMessage('City must be at least 2 characters long.'),
    
    body('state')
        .trim()
        .notEmpty().withMessage('State is required.')
        .isLength({ min: 2 }).withMessage('State must be at least 2 characters long.'),
    
    body('address_type')
        .notEmpty().withMessage('Address type is required.')
        .isIn(['home', 'work']).withMessage('Address type must be either home or work.'),
    
    body('land_mark')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 2 }).withMessage('Landmark must be at least 2 characters long.'),
    
    body('mobile_number')
        .trim()
        .notEmpty().withMessage('Mobile number is required.')
        .isMobilePhone('any').withMessage('Invalid mobile number.'),
    
    body('alternate_number')
        .optional({ checkFalsy: true })
        .trim()
        .isMobilePhone('any').withMessage('Invalid alternate number.')
]

module.exports = addAddressValidation