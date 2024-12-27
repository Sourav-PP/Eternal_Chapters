const validateOtpInput = (req, res, next) => {
    const { otp } = req.body;

    // Ensures OTP is a 6-digit number
    if (!/^\d{6}$/.test(otp)) { 
        return res.render('verify-otp', { message: "Invalid OTP format. Please enter a 6-digit number." });
    }

    next();
};


module.exports = validateOtpInput