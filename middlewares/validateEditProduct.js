const { body } = require('express-validator');

const editProductValidation = [
    body('title')
        .trim()
        .notEmpty().withMessage('Offer name is required')
        .matches(/[A-Za-z0-9]/).withMessage('Offer name must contain at least one letter or number')
        .isLength({ min: 2, max: 50 }).withMessage('Offer name must be between 2 and 50 characters'),
    body('author_name')
        .trim()
        .matches(/^[A-Za-z.\s]+$/)  
        .withMessage('Name can only contain letters, dots, and spaces')
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),
    body('price')
        .notEmpty()
        .withMessage('Price is required.')
        .isNumeric()
        .withMessage('Price must be a number.')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number.'),
    body('available_quantity')
        .notEmpty()
        .withMessage('Available quantity is required.')
        .isFloat({ min: 0 })
        .withMessage('Available quantity must be a positive number'),
    body('category_id').notEmpty().withMessage('Category ID is required.'),
    body('status')
        .notEmpty()
        .withMessage('Status is required.')
        .isIn(['active', 'discontinued', 'unavailable'])
        .withMessage('invalid status'),
    body('publishing_date').optional({ checkFalsy: true }),
    body('publisher').notEmpty().withMessage('Publisher is required.'),
    body('page')
        .notEmpty()
        .withMessage('Page is required.')
        .isInt({ min: 1 })
        .withMessage('Number of pages must be a valid integer.'),
    body('language')
        .notEmpty()
        .withMessage('Language is required.')
        .isIn(['malayalam', 'english'])
        .withMessage('Invalid language value.'),
    body('description').notEmpty().withMessage('Description is required.'),
];

module.exports = editProductValidation;
