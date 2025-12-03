const { body } = require('express-validator');

const signupValidationRules = [
    body('first_name')
        .trim()
        .matches(/^[A-Za-z ]+$/)
        .withMessage('Name can only contain letters and spaces')
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),
    body('last_name')
        .trim()
        .matches(/^[A-Za-z ]+$/)
        .withMessage('Name can only contain letters and spaces')
        .isLength({ min: 1, max: 50 })
        .withMessage('Name must be between 1 and 50 characters'),
    body('email')
        .trim()
        .isEmail()
        .withMessage('Invalid email address')
        .isLength({ max: 100 })
        .withMessage('Email must be at most 100 characters'),
    body('phone_no')
        .trim()
        .notEmpty()
        .withMessage('Phone number is required')
        .isMobilePhone('en-IN')
        .withMessage('Invalid phone number')
        .isLength({ min: 10, max: 10 })
        .withMessage('Phone number must be 10 digits'),
    body('password')
        .trim()
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/\d/)
        .withMessage('Password must contain at least one number')
        .matches(/[A-Za-z]/)
        .withMessage('Password must contain at least one letter')
        .matches(/[@$!%*-?&#]/)
        .withMessage('Password must contain at least one special character'),
    body('confirmPass')
        .trim()
        .notEmpty()
        .withMessage('Please confirm the password')
        .custom((value, { req }) => {
            if (value != req.body.password) {
                throw new Error('Password do not match');
            }
            return true;
        }),
];

module.exports = signupValidationRules;
