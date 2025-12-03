const { body } = require('express-validator');

const signinValidationRules = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Invalid email address')
        .isLength({ max: 100 })
        .withMessage('Email must be at most 100 characters'),
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
];

module.exports = signinValidationRules;
