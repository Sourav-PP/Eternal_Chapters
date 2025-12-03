const adminRoutes = require('../constants/routeConsts/adminRoutes');
const authRoutes = require('../constants/routeConsts/authRoutes');
const userRoutes = require('../constants/routeConsts/userRoutes');
const User = require('../models/userSchema');

const userAuth = async (req, res, next) => {
    try {
        if (!req.session.user) {
            // No session, redirect to login
            return res.redirect(`${authRoutes.login}`); 
        }

        const user = await User.findById(req.session.user);

        if (user.is_blocked) {
            req.flash('error', 'Your account is blocked. Please contact support.');
            return res.redirect(`${userRoutes.blockedPage}`);
        }
        if (user) {
            // User is authenticated and not blocked
            return next(); 
        }

        // User either doesn't exist or is blocked
        res.redirect(`${authRoutes.login}`);
    } catch (error) {
        console.error('Error in userAuth:', error);
        res.status(500).send('Internal server error!');
    }
};

//admin authentication
const adminAuth = async (req, res, next) => {
    if (req.session.admin) {
        User.findOne({ is_admin: true })
            .then(data => {
                if (data) {
                    next();
                } else {
                    res.redirect(`${adminRoutes.base}${authRoutes.login}`);
                }
            })
            .catch(error => {
                console.log('error in the adminAuth', error);
            });
    } else {
        res.redirect(`${adminRoutes.base}${authRoutes.login}`);
    }
};

module.exports = {
    userAuth,
    adminAuth,
};
