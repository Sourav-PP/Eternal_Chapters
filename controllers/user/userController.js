const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const nodemailer = require('nodemailer')
const env = require('dotenv').config()
const bcrypt = require('bcrypt')
const { validationResult } = require('express-validator')
const Banner = require('../../models/bannerSchema')




const page_404 = async (req, res) => {
    try {
        // Set 404 status code and render the custom 404 page
        res.status(404).render('page_404');
    } catch (error) {
        console.error('Error rendering 404 page:', error);
        // Fallback response for server-side issues
        res.status(500).send('An error occurred while displaying the 404 page.');
    }
};

//generatin a 6 digit otp
function gererateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

//sending the verifiication mail
async function sendVerficationEmail(email, otp) {
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

        return info.accepted.length > 0

    } catch (error) {
        console.error("Error sending email", error)
        return false
    }
}

//hashing password
const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash
    } catch (error) {
        console.error("Error hashing password", error)
    }
}

//load signup page
const loadSignup = async (req, res) => {
    try {
        return res.render('signup', { message: "", errors: [] })
    } catch (error) {
        console.log("user signup page error", error.message)
        res.status(500).send('Server error')
    }
}

//signup logic
const signup = async (req, res) => {
    try {
        const errors = validationResult(req);  // Validation errors

        if (!errors.isEmpty()) {
            return res.render('signup', {
                errors: errors.array(),  // Pass the errors to the view
                data: req.body  // Retain form data
            });
        }

        const { first_name, last_name, email, phone_no, password, confirmPass } = req.body
        if (password !== confirmPass) {
            return res.render('signup', { message: "Password do not match" })
        }

        const findUser = await User.findOne({ email })
        if (findUser) {
            return res.render('signup', { message: "User with this email already exist" })
        }

        const otp = gererateOtp()
        const emailSent = await sendVerficationEmail(email, otp);

        if (!emailSent) {
            return res.json("email-error")
        }

        req.session.userOtp = otp;
        req.session.otpGeneratedAt = Date.now()
        req.session.userData = { first_name, last_name, email, phone_no, password }

        res.render('verify-otp', { message: '' })
        console.log("OTP sent", otp)

    } catch (error) {
        console.error("signup error", error)
        res.redirect('/page_404')
    }

}

//verifying the otp
const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body
        if (otp === req.session.userOtp) {
            const { first_name, last_name, email, phone_no, password } = req.session.userData
            const passwordHash = await securePassword(password)

            const newUser = new User({
                first_name,
                last_name,
                email,
                phone_no,
                password: passwordHash,
            })
            await newUser.save()

            req.session.user = newUser._id
            req.session.userOtp = null
            req.session.userData = null

            return res.render('login', {
                message: "Account successfully verified!",
                messageType: "success"
            })

        } else {
            return res.render('verify-otp', {
                message: "Invalid otp, please try again",
                messageType: "failure"
            })
        }
    } catch (error) {
        console.error("error verifying otp", error)
        res.redirect('/page_404')
    }
}

//loading the login page
const loadLogin = async (req, res) => {
    try {
        if (req.session.user) {
            return res.redirect('/');
        }

        return res.render('login', {
            error: req.flash('error'),
            validationError: req.flash('validationError'),
            data: req.flash('data')
        })
    } catch (error) {
        console.error("error loading login page", error)
    }
}

//Login logic
const login = async (req, res) => {
    try {

        const errors = validationResult(req);  // Validation errors

        if (!errors.isEmpty()) {
            // Store validation errors and form data
            req.flash('validationError', errors.array());
            req.flash('data', req.body);
            return res.redirect('/login'); // Redirect to login page
        }
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            req.flash('error', 'Invalid Email or Password')
            return res.redirect('/login');
        }

        // Check if the user is blocked
        if (user.is_blocked) {
            req.flash('error', 'Your account is blocked. Please contact support.')
            return res.redirect('/login');
        }

        // Validate password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            console.log("Invalid password");
            req.flash('error', 'Invalid Email or Password')
            return res.redirect('/login');
        }

        //session
        req.session.user = user._id;

        res.redirect('/');
    } catch (error) {
        console.error("Error during login:", error);
        res.redirect('/page_404');
    }
};

//load homepage
const loadHomepage = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login')
        }

        const products = await Product.find({ is_deleted: false })

        const updatedProducts = products.map(product => ({
            ...product._doc,
            title: product.title
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
        }));

        const bannerData = await Banner.findOne({ name: 'Home Banner' })


        res.render('home', {
            products: updatedProducts,
            banner: bannerData,
            error: req.flash('error')
        })
    } catch (error) {
        console.log('user load homepage error', error.message);
        res.status(500).send('Server error')
    }
}

//logout
const logout = async (req, res) => {
    try {
        req.session.destroy(err => {
            if (err) {
                console.log("error destroying admin session", err)
            }
            res.redirect('/login')
        })
    } catch (error) {
        console.log("error during user logout", error)
    }
}







module.exports = {
    loadSignup,
    loadHomepage,
    page_404,
    signup,
    verifyOtp,
    loadLogin,
    login,
    logout,
}