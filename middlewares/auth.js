const User = require('../models/userSchema')

const userAuth = async(req,res,next) => {
    if(req.session.user) {
        User.findById(req.session.user)
        .then(data => {
            if(data && !data.is_blocked) {
                next()
            }else{
                res.redirect('/login')
            }
        }).catch(error => {
            console.log("error in the userAuth", error)
            res.status(500).send("Internal server error!")
        }) 
    }else{
        res.redirect('/login')
    }
}

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