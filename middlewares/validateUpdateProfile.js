const {body} = require("express-validator")

const updateProfileValidation = [
    body('first_name')
        .notEmpty().withMessage('First name is required')
        .isLength({ min: 2 }).withMessage('First name must be at least 2 characters')
        .trim(),

    body('last_name')
        .notEmpty().withMessage('Last name is required')
        .isLength({ min: 2 }).withMessage('Last name must be at least 2 characters')
        .trim(),

    body('date_of_birth')
        .notEmpty().withMessage('Date of birth is required')
        .isISO8601().withMessage('Date of birth must be a valid date'),

    body('email')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail()
        .custom((value) => {
            // Custom regex to disallow emails with underscores in the local part
            const regex = /^[a-zA-Z0-9.%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!regex.test(value)) {
                throw new Error('Email address cannot contain underscores');
            }
            return true;
        })
]

module.exports = updateProfileValidation