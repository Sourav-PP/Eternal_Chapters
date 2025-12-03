const { body } = require('express-validator');

const updateProfileValidation = [
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
    body('date_of_birth')
        .notEmpty()
        .withMessage('Date of birth is required')
        .isISO8601()
        .withMessage('Date of birth must be a valid date')
        .custom(value => {
            const dob = new Date(value);
            const today = new Date();

            // 1. Should not be in the future
            if (dob > today) {
                throw new Error('Date of birth cannot be in the future');
            }

            // 2. Should be after year 1900 (realistic)
            if (dob.getFullYear() < 1900) {
                throw new Error('Date of birth is too old or invalid');
            }

            return true;
        }),
    body('email')
        .trim()
        .isEmail()
        .withMessage('Invalid email address')
        .isLength({ max: 100 })
        .withMessage('Email must be at most 100 characters'),
];

module.exports = updateProfileValidation;
