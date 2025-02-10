const express = require('express');
const passport = require('passport');
const router = express.Router();
const Wallet = require('../models/walletSchema');

// Start Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Callback URL
router.get('/google/callback', passport.authenticate('google', {
    failureRedirect: '/login',
}), async (req, res) => {
    // Check if user is already authenticated
    if (req.isAuthenticated()) {
        // Assign the user's ID to the session
        req.session.user = req.user._id; 

        // Check if the user already has a wallet
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
    res.redirect('/'); // Redirect to your desired page after successful login
});


// Logout Route
router.get('/logout', (req, res) => {
    req.logout(err => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
});

module.exports = router;
