const express = require('express');
const passport = require('passport');
const router = express.Router();
const Wallet = require('../models/walletSchema');
const authRoutes = require('../constants/routeConsts/authRoutes');
const userRoutes = require('../constants/routeConsts/userRoutes');

// Start Google OAuth
router.get(authRoutes.google, passport.authenticate('google', { scope: ['profile', 'email'] }));

// Callback URL
router.get(
    authRoutes.googleCallback,
    passport.authenticate('google', {
        failureRedirect: authRoutes.login,
    }),
    async (req, res) => {
        // Check if user is already authenticated
        if (req.isAuthenticated()) {
            req.session.user = req.user._id;

            // Checking if the user already has a wallet
            const existingWallet = await Wallet.findOne({ user_id: req.user._id });

            if (!existingWallet) {
                // Create wallet for the new user
                const newWallet = new Wallet({
                    user_id: req.user._id,
                    balance: 0,
                });
                await newWallet.save();
            }

            console.log('User already logged in:', req.user);
        } else {
            console.error('User is not authenticated after callback');
        }
        res.redirect(userRoutes.base);
    },
);

// Logout Route
router.get(authRoutes.logout, (req, res) => {
    req.logout(err => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect(userRoutes.base);
    });
});

module.exports = router;
