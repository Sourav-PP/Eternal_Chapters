const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const nodemailer = require('nodemailer')
const env = require('dotenv').config()
const bcrypt = require('bcrypt')

const { validationResult } = require('express-validator')

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
        const passwordHash = await bcrypt.hash(password,10)
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
        console.log("signup body:",req.body)
        const errors = validationResult(req);  // Validation errors

        console.log("helloiii:",errors.array())

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

        res.render('verify-otp', {message: ''})
        console.log("OTP sent", otp)

    } catch (error) {
        console.error("signup error", error)
        res.redirect('/page_404')
    }

}

//verifying the otp
const verifyOtp = async(req,res) => {
    try {
        const {otp} = req.body
        if(otp === req.session.userOtp) {
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

        }else{
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
const loadLogin = async(req,res) => {
    try {
        return res.render('login', { errors: [] })
    } catch (error) {
        console.error("error loading login page",error)
    }
}

//Login logic
const login = async (req, res) => {
    try {
        console.log("Login endpoint hit");

        const { email, password } = req.body;
        console.log("Request body:", req.body);

        // Find user by email
        const user = await User.findOne({ email });
        console.log("User retrieved:", user);

        if (!user) {
            console.log("User not found");
            return res.render('login', { message: 'Invalid email or password', messageType: 'failure' });
        }

        // Validate password
        console.log("Validating password...");
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log("Password valid:", isPasswordValid);

        if (!isPasswordValid) {
            console.log("Invalid password");
            return res.render('login', { message: 'Invalid email or password', messageType: 'failure' });
        }

        req.session.user = user._id;
        console.log("Session User ID set:", req.session.user);

        console.log("Halloooo");
        res.redirect('/');
    } catch (error) {
        console.error("Error during login:", error);
        res.redirect('/page_404');
    }
};


//load homepage
const loadHomepage = async (req, res) => {
    try {
        if(!req.session.user){
            return res.redirect('/login')
        }

        const products = await Product.find({})
        console.log("products:::",products)
        res.render('home',{products: products})
    } catch (error) {
        console.log('user load homepage error', error.message);
        res.status(500).send('Server error')
    }
}

//logout
const logout = async(req,res) => {
    req.session.destroy(() => {
        res.redirect('/login')
    })
}








module.exports = {
    loadSignup,
    loadHomepage,
    page_404,
    signup,
    verifyOtp,
    loadLogin,
    login
}