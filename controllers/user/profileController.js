const { ExplainVerbosity } = require('mongodb')
const User = require('../../models/userSchema')
const mongoose = require('mongoose')
const nodemailer = require('nodemailer')
const env = require('dotenv').config()
const bcrypt = require('bcrypt')
const Address = require('../../models/addressSchema')
const { validationResult } = require("express-validator")

//generate otp for forgot password
function generateForgotOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

//verification email
const sendVerficationEmail = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "verify your account",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`
        })

        console.log("email sent:", info.messageId)
        return true
    } catch (error) {
        console.error('error sending email for forgot password', error)
        return false
    }
}

//secure password
const securePassword = async (req, res) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash
    } catch (error) {
        console.log('error hashing password', error)
    }
}

//forgot password
const getForgotpage = async (req, res) => {
    try {
        res.render('forgotPassword')
    } catch (error) {
        console.error('error loading forgot password', error)
    }
}

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body
        console.log("recipent email:", email)
        const findUser = await User.findOne({ email: email })

        if (findUser) {
            const otp = generateForgotOtp()
            const emailSent = await sendVerficationEmail(email, otp);
            if (emailSent) {
                req.session.userOtp = otp;
                req.session.email = email
                res.render('enterForgotPass-otp')
                console.log("forgot pass otp:", otp)
            } else {
                res.json({ success: false, message: "failed to send OTP, please try again" })
            }
        } else {
            res.render('forgotPassword', {
                message: "User with this email does not exist"
            })
        }

    } catch (error) {
        console.error('error posting the forgot email', error)
    }
}

const verifyForgotPassOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp

        console.log("entered otp:", enteredOtp, "Session otp:", req.session.userOtp)
        if (enteredOtp === req.session.userOtp) {
            console.log('hello mr')
            res.redirect('/reset-password')
        } else {
            res.json({ success: false, message: "Otp not matching" })
        }

    } catch (error) {
        console.error("error in verifying otp", error)
    }
}

//resend otp
const resendOtp = async (req, res) => {
    try {
        console.log("hi resend")
        const otp = generateForgotOtp()
        const email = req.session.email

        console.log("resending otp to email:", email);
        const emailSent = await sendVerficationEmail(email, otp)
        if (emailSent) {
            console.log("resend otp:", otp)
            req.session.userOtp = otp
            res.status(200).json({ success: true, message: "Resend otp Successfull" })
        }

    } catch (error) {
        console.error("error resending otp:", error)
        res.status(500).json({ success: false, message: "Internal server error" })
    }
}

const getResetPassword = async (req, res) => {
    try {
        res.render('reset-password', {
            messages: req.flash()
        })
    } catch (error) {
        console.error("error loading the reset password page", error)
    }
}

const resetPassword = async (req, res) => {
    try {
        const { password, confirmPassword } = req.body
        const email = req.session.email
        if (password === confirmPassword) {
            const passwordHash = await securePassword(password)
            await User.updateOne(
                { email: email },
                { $set: { password: passwordHash } }
            )
            req.flash('success', 'Password reset successful! Please log in.')
            res.redirect('/login');
        } else {
            req.flash('error', 'Passwords do not match. Please try again.');
            return res.redirect('/reset-password');
        }

    } catch (error) {
        console.log("error reseting password", error)
    }
}

//get user profile
const userProfile = async (req, res) => {
    try {
        const userId = req.session.user
        console.log("userrrr", userId)
        const userData = await User.findById(userId);
        const address = await Address.find({ user_id: userId })
        console.log("user address:", address)

        res.render('profile', {
            user: userData,
            address,
            success: req.flash('success')

        })
    } catch (error) {
        console.error("error loading userProfile", error)
    }
}

const updateProfile = async (req, res) => {
    try {
        const userId = req.session.user
        const { first_name, last_name, date_of_birth, email } = req.body

        const user = await User.findByIdAndUpdate(userId, {
            first_name,
            last_name,
            date_of_birth,
            email
        })

        req.flash('success', 'Profile updated successfylly')
        res.redirect('/userProfile')
    } catch (error) {
        console.error("error updating the profile", error)
    }
}

//address management page
const manageAddress = async (req, res) => {
    try {

        const userId = req.session.user
        const userData = await User.findById(userId)
        const address = await Address.find({ user_id: userId })
        res.render('manageAddress', {
            user: [],
            address,
            success: req.flash('success')
        })
    } catch (error) {
        console.log("error loading address management page", error)
    }
}

const getAddAddress = async (req, res) => {
    try {
        const userId = req.session.user
        const userData = await User.findById(userId)
        const validationErrors = JSON.parse(req.flash('validationErrors')[0] || '[]'); // Parse back to an array
        const formData = JSON.parse(req.flash('formData')[0] || '{}'); // Parse back to an object

        res.render('add-address', {
            success: req.flash('success'),
            error: req.flash('error'), // General errors
            validationErrors,
            formData,
        });
    } catch (error) {
        console.error("error loading the add address page", error)
        req.flash('error', 'Failed to load the page. Please try again.');
        res.redirect('/addressManagent');
    }
}

//add address
const addAddress = async (req, res) => {
    try {
        const userId = req.session.user
        const userData = await User.findById(userId)

        if (!userData) {
            req.flash('error', 'User not found')
            return res.redirect('/addAddress')
        }

        // Handle validation errors
        const errors = validationResult(req);
        console.log("add address error", errors)
        if (!errors.isEmpty()) {
            req.flash('validationErrors', JSON.stringify(errors.array())); // Convert array to JSON string
            req.flash('formData', JSON.stringify(req.body)); // Convert form data to JSON string
            return res.redirect('/addAddress'); // Redirect with errors and form data
        }


        const { name, pin_code, city, state, address_type, land_mark, mobile_number, alternate_number } = req.body

        const userAddress = await Address.findOne({ user_id: userId })

        const newAddress = new Address({
            name,
            user_id: userId,
            city,
            state,
            pin_code,
            address_type,
            land_mark,
            mobile_number,
            alternate_number,
        })
        await newAddress.save()

        req.flash('success', 'Address added successfully!');
        res.redirect('/addAddress')

    } catch (error) {
        console.error("error adding the address", error)
        req.flash('error', 'Failed to add address. Please try again.');
        res.redirect('/addAddress')
    }
}

//get edit address
const getEditAddress = async (req, res) => {
    try {
        const userId = req.session.user
        const addressId = req.params.id

        const address = await Address.findById(addressId)

        console.log("edit addddddd", address)
        const userData = await User.findById(userId)

        res.render('edit-address', {
            success: req.flash('success'),
            error: req.flash('error'), // General errors
            address,
        });
    } catch (error) {
        console.error("error loading the edit address page", error)
        req.flash('error', 'Failed to load the page. Please try again.');
        res.redirect('/addressManagent');
    }
}

//edit the address
const editAddress = async (req, res) => {
    try {
        const userId = req.session.user
        const addressId = req.params.id
        const { name, pin_code, city, state, address_type, land_mark, mobile_number, alternate_number } = req.body

        await Address.findByIdAndUpdate(addressId,
            {
                name,
                pin_code,
                city,
                state,
                address_type,
                land_mark,
                mobile_number,
                alternate_number,
            },
            { new: true }
        )

        req.flash('success', 'Address edited successfully!')
        res.redirect('/addressManagent')
        const newAddress = {}
    } catch (error) {
        console.error("error editing the update")
    }
}

const deleteAddress = async(req,res) => {
    try {
        const addressId = req.params.id
        await Address.findByIdAndDelete(addressId)

        req.flash('success', 'Address deleted successfully!')
        res.redirect('/addressManagent')
    } catch (error) {
        
    }
}



module.exports = {
    userProfile,
    forgotPassword,
    getForgotpage,
    verifyForgotPassOtp,
    getResetPassword,
    resendOtp,
    resetPassword,
    manageAddress,
    getAddAddress,
    addAddress,
    updateProfile,
    editAddress,
    getEditAddress,
    deleteAddress,
}