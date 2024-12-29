const User = require('../models/userSchema')

const userAuth = async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login'); // No session, redirect to login
        }

        const user = await User.findById(req.session.user);
        if (user && !user.is_blocked) {
            return next(); // User is authenticated and not blocked
        }

        // User either doesn't exist or is blocked
        res.redirect('/login');
    } catch (error) {
        console.error("Error in userAuth:", error);
        res.status(500).send("Internal server error!");
    }
};


//admin authentication
const adminAuth = async(req,res,next) => {
    if(req.session.admin){
        User.findOne({is_admin:true})
        .then(data => {
            if(data){
                next()
            }else{
                res.redirect('/admin/login')
            }
        }).catch(error => {
            console.log('error in the adminAuth',error)
        }) 
    }else{
        res.redirect('/admin/login')
    }
}

module.exports = {
    userAuth,
    adminAuth,
}