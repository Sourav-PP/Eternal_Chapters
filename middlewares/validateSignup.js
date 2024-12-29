const { body, validationResult } = require('express-validator')

const signupValidationRules = [
    body('first_name')
        .trim()
        .notEmpty().withMessage("Name is required")
        .isLength({ min: 2 }).withMessage("Name must be atleast 2 characters long")
        .matches(/^[A-Za-z]+$/).withMessage("Name must not contain numbers or special characters"),
    body('last_name')
        .trim()
        .notEmpty().withMessage("Name is requried")
        .isLength({ min: 1 }).withMessage("Name must be atleast 1 characters long")
        .matches(/^[A-Za-z]+$/).withMessage("Name must not contain numbers or special characters"),
    body('email')
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid email format"),
    body('phone_no')
        .trim()
        .notEmpty().withMessage("Phone number is required")
        .isMobilePhone().withMessage("Invalid phone number"),
    body('password')
        .trim()
        .notEmpty().withMessage("Password is requried")
        .isLength({min : 8}).withMessage("Password must be atleast 8 characters long")
        .matches(/\d/).withMessage("Password must contain atleast one number")
        .matches(/[A-Za-z]/).withMessage("Password must contain atleast one letter")
        .matches(/[@$!%*-?&#]/).withMessage("Password must contain atleast one special character"),
    body('confirmPass')
    .trim()
    .notEmpty().withMessage("Please confirm the password")
    .custom((value, {req}) => {
        if(value != req.body.password) {
            throw new Error("Passwored do not match")
        }
        return true
    })
]

module.exports = signupValidationRules