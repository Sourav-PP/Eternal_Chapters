const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const nodemailer = require('nodemailer')
const env = require('dotenv').config()
const bcrypt = require('bcrypt')
const { validationResult } = require('express-validator')
const Banner = require('../../models/bannerSchema')
const Wallet = require('../../models/walletSchema')
const Category = require('../../models/categorySchema')
const { session } = require('passport')




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

// generatin a 6 digit otp
function gererateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

// sending the verifiication mail
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
        if (req.session.user) {
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
    } catch (error) {
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

        const newOtp = gererateOtp();
        req.session.userOtp = newOtp; // Update session with new OTP

        console.log("Generated new OTP:", newOtp);

        const email = req.session.userData.email;

        const emailSent = await sendVerficationEmail(email, newOtp);
        if (!emailSent) {
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
            return res.redirect('/login');
        }

        const { price, author, stock_state, sort, categoryName, page } = req.query;

        const currentPage = parseInt(page) || 1;
        const itemsPerPage = 12;
        const skip = (currentPage - 1) * itemsPerPage;

        const query = { is_deleted: false };

        // Filter by price
        if (price) {
            const priceParts = price.split("-");
            if (priceParts.length === 2) {
                const [min, max] = priceParts.map(Number);
                if (!isNaN(min) && !isNaN(max)) {
                    query.price = { $gte: min, $lte: max };
                }
            } else if (priceParts.length === 1) {
                const min = Number(priceParts[0].replace("+", "").trim());
                if (!isNaN(min) && price.endsWith("+")) {
                    query.price = { $gte: min };
                }
            }
        }

        // Filter by author
        if (author) {
            query.author_name = new RegExp(author, "i");
        }

        // Filter by category (if provided)
        let category = null;
        if (categoryName === "All Categories" || !categoryName) {
            const categories = await Category.find({ is_deleted: false }).select('_id');
            if (categories && categories.length > 0) {
                query.category_id = { $in: categories.map(cat => cat._id) };
            }
        } else {
            category = await Category.findOne({ name: categoryName });
            if (category) {
                query.category_id = category._id;
            }
        }

        // Apply filters and pagination
        let products = await Product.find(query)
            .populate('offer_id')
            .populate({
                path: 'category_id',
                populate: {path: 'offer_id'}
            })
            .skip(skip)
            .limit(itemsPerPage);

        // Apply stock state filter in the application logic
        if (stock_state) {
            const stockStates = Array.isArray(stock_state) ? stock_state : [stock_state];
            products = products.filter(product => stockStates.includes(product.stock_state));
        }

        // Sort products
        if (sort === "asc") {
            products = products.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
        } else if (sort === "desc") {
            products = products.sort((a, b) => b.title.toLowerCase().localeCompare(a.title.toLowerCase()));
        }

        // apply offer logic
        products = products.map(product => {
            let offerDiscount = 0
            let discountedPrice = product.price

            if(product.offer_id && product.offer_id.status === 'active' &&
                (!product.offer_id.end_date || new Date(product.offer_id.end_date) > new Date()))
            {
                offerDiscount = (product.price * product.offer_id.discount_value) / 100
                discountedPrice = product.price - offerDiscount
            }

            // Check category offer (if no product offer exists or if category offer is higher)
            if((!product.offer_id || product.offer_id.status !== 'active') &&
                product.category_id && product.category_id.offer_id &&
                product.category_id.offer_id.status === 'active' &&
                (!product.category_id.offer_id.end_date || new Date(product.category_id.offer_id.end_date) > new Date()))
            {
                const categoryDiscount = (product.price * product.category_id.offer_id.discount_value) / 100
                //apply higher discount between product and category
                if(categoryDiscount > offerDiscount) {
                    offerDiscount = categoryDiscount
                    discountedPrice = product.price - categoryDiscount
                }
            }

            return {
                ...product.toObject(),
                offerDiscount,
                discountedPrice,
                originalPrice: product.price
            }
        }) 

        const totalCount = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalCount / itemsPerPage);

        const bannerData = await Banner.findOne({ name: 'Home Banner' });

        // Define the title
        const title = categoryName ? categoryName : 'Best Sellers';
        const capTitle = title.toUpperCase()

        // If the request is an AJAX request, return just the product list
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.render("productList", {
                products,
                totalPages,
                currentPage,
                title: capTitle,
            });
        } else {
            // Otherwise, render the full homepage
            return res.render('home', {
                products,
                banner: bannerData,
                error: req.flash('error'),
                success: req.flash('success'),
                category,
                totalPages,
                currentPage,
                title:capTitle,
            });
        }
    } catch (error) {
        console.log('user load homepage error', error.message);
        res.status(500).send('Server error');
    }
};

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