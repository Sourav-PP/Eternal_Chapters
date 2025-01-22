const { body } = require('express-validator')

const editProductValidation = [
    body('title')
        .notEmpty().withMessage('Title is required.'),
    body('author_name')
        .notEmpty().withMessage('Author name is required.'),
    body('price')
        .notEmpty().withMessage('Price is required.')
        .isNumeric().withMessage('Price must be a number.')
        .isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
    body('available_quantity')
        .notEmpty().withMessage('Available quantity is required.')
        .isFloat({ min: 0 }).withMessage('Available quantity must be a positive number'),
    body('category_id')
        .notEmpty().withMessage('Category ID is required.'),
    body('status')
        .notEmpty().withMessage('Status is required.')
        .isIn(['active', 'discontinued', 'unavailable']).withMessage('invalid status'),
    body('publishing_date')
        .optional({ checkFalsy: true }),
    body('publisher')
        .notEmpty().withMessage('Publisher is required.'),
    body('page')
        .notEmpty().withMessage('Page is required.')
        .isInt({ min: 1 }).withMessage('Number of pages must be a valid integer.'),
    body('language')
        .notEmpty().withMessage('Language is required.')
        .isIn(['malayalam', 'english']).withMessage('Invalid language value.'),
    body('description')
        .notEmpty().withMessage('Description is required.'),
]

module.exports = editProductValidation