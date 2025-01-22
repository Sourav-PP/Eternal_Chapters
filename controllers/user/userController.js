const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const nodemailer = require('nodemailer')
const env = require('dotenv').config()
const bcrypt = require('bcrypt')
const { validationResult } = require('express-validator')
const Banner = require('../../models/bannerSchema')
const Wallet = require('../../models/walletSchema')




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
        if(req.session.user) {
            return res.redirect('/')
        }
        return res.render('signup', {
            validationError: req.flash('validationError'),
            data: req.flash('data'),
            error: req.flash('error'),
        })
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
            req.flash('validationError', errors.array());
            req.flash('data', req.body);
            return res.redirect('/signup');
        }

        const { first_name, last_name, email, phone_no, password, confirmPass } = req.body
        if (password !== confirmPass) {
            req.flash('error', 'Password do not match!')
            return res.redirect('/signup')
        }

        const findUser = await User.findOne({ email })
        if (findUser) {
            req.flash('error', 'User with this email already exist')
            return res.redirect('/signup')
        }

        const otp = gererateOtp()
        const emailSent = await sendVerficationEmail(email, otp);

        if (!emailSent) {
            return res.status(500).json({ error: "Failed to send verification email" });
        }

        req.session.userOtp = otp;
        req.session.otpGeneratedAt = Date.now()
        req.session.userData = { first_name, last_name, email, phone_no, password }

        
        res.redirect('/verify-otp') 
        console.log("OTP sent", otp)

    } catch (error) {
        console.error("signup error", error)
        res.redirect('/page_404')
    }

}

//get veryfy otp page
const getOtpPage = async (req, res) => {
    try {
        if (!req.session.userOtp) {
            return res.redirect('/signup')
        }

        const error = req.flash('error') || [];
        res.render('verify-otp', { 
            error,
        })
    }catch(error){
        console.error("error loading verify otp page", error)
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

            
            req.session.userOtp = null
            req.session.userData = null

            req.flash('success', 'Account successfully verified! Please login to continue.')
            return res.redirect('/login')

        } else {

            req.flash('error', 'Invalid OTP. Please try again.')
            return res.redirect('/verify-otp')
        }
    } catch (error) {
        console.error("error verifying otp", error)
        res.redirect('/page_404')
    }
}

//resend otp
const resendSignupOtp = async (req, res) => {
    try {

        if (!req.session.userOtp || !req.session.userData) {
            return res.redirect('/signup');
        }

        const newOtp = gererateOtp(); // Generate new OTP
        req.session.userOtp = newOtp; // Update session with new OTP

        console.log("Generated new OTP:", newOtp);

        const email = req.session.userData.email; // Retrieve email from userData

        const emailSent = await sendVerficationEmail(email, newOtp);
        if (!emailSent) {
            // Send only one response, and avoid calling res.redirect() or res.send() after this.
            return res.status(500).json({ success: false, message: 'Failed to resend OTP. Please try again later.' });
        }

        req.session.otpGeneratedAt = Date.now(); // Update OTP generation timestamp
        res.status(200).json({ success: true, message: 'A new OTP has been sent to your email.' });

    } catch (error) {
        console.error("Error resending OTP:", error);
        res.redirect('/page_404');
    }
};

//loading the login page
const loadLogin = async (req, res) => {
    try {
        if (req.session.user) {
            return res.redirect('/');
        }

        return res.render('login', {
            error: req.flash('error'),
            validationError: req.flash('validationError'),
            data: req.flash('data'),
            success: req.flash('success'),
        });
        
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
            req.flash('error', 'Invalid Email or Password')
            return res.redirect('/login');
        }
        
        //session
        req.session.user = user._id;

        // Check if the user already has a wallet
        const existingWallet = await Wallet.findOne({ user_id: user._id });

        if (!existingWallet) {
            // Create wallet for the new user
            const newWallet = new Wallet({
                user_id: user._id,
                balance: 0,
            });
            await newWallet.save();
        }

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

        const bannerData = await Banner.findOne({ name: 'Home Banner' })


        res.render('home', {
            products,
            banner: bannerData,
            error: req.flash('error'),
            category: []
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

//blocked user page
const blockedUser = async (req, res) => {
    try {
        res.render('blocked')
    } catch (error) {
        console.log("error loading the blocked user page")
    }
}







module.exports = {
    loadSignup,
    loadHomepage,
    page_404,
    signup,
    verifyOtp,
    resendSignupOtp,
    loadLogin,
    login,
    logout,
    blockedUser,
    getOtpPage,

}