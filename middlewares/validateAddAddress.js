const { body } = require('express-validator');

const addAddressValidation = [
    body('name')
        .trim()
        .matches(/^[A-Za-z ]+$/)
        .withMessage('Name can only contain letters and spaces')
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),
    body('pin_code')
        .trim()
        .notEmpty()
        .withMessage('Pin code is required.')
        .isPostalCode('any')
        .withMessage('Invalid pin code.'), 
    body('city')
        .trim()
        .notEmpty()
        .withMessage('City is required.')
        .matches(/^[A-Za-z ]+$/)
        .withMessage('City name can only contain letters and spaces')
        .isLength({ min: 2 })
        .withMessage('City must be at least 2 characters long.'),

    body('state')
        .trim()
        .notEmpty()
        .withMessage('State is required.')
        .matches(/^[A-Za-z ]+$/)
        .withMessage('State name can only contain letters and spaces')
        .isLength({ min: 2 })
        .withMessage('State must be at least 2 characters long.'),

    body('address_type')
        .notEmpty()
        .withMessage('Address type is required.')
        .isIn(['home', 'work'])
        .withMessage('Address type must be either home or work.'),

    body('land_mark')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 2 })
        .withMessage('Landmark must be at least 2 characters long.'),

    body('mobile_number')
        .trim()
        .notEmpty()
        .withMessage('Phone number is required')
        .isMobilePhone('en-IN')
        .withMessage('Invalid phone number')
        .isLength({ min: 10, max: 10 })
        .withMessage('Phone number must be 10 digits'),
    body('alternate_number')
        .optional({ checkFalsy: true })
        .trim()
        .notEmpty()
        .withMessage('Phone number is required')
        .isMobilePhone('en-IN')
        .withMessage('Invalid phone number')
        .isLength({ min: 10, max: 10 })
        .withMessage('Phone number must be 10 digits'),
];

module.exports = addAddressValidation;
