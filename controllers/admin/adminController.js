const User = require('../../models/userSchema')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const session = require('express-session')
const { validationResult } = require('express-validator')

const pageError = async(req,res) => {
    try {
        res.render('error-page')
    } catch (error) {
        console.log("error loadin the error-page", error)
    }
}

const loadLogin = async (req, res) => {
    try {
        if (req.session.admin) {
            res.redirect('/admin')
        } else {
            res.render('admin-login', {
                message: null,
                messageType: null
            })
        }
    } catch (error) {
        console.error("error loading admin login", error)
    }
}

//login admin
const login = async (req, res) => {
    try {
        const errors = validationResult(req);  // Validation errors
        
                if (!errors.isEmpty()) {
                    return res.render('admin-login', {
                        errors: errors.array(),  // Pass the errors to the view
                        data: req.body  // Retain form data
                    });
                }

        const { email, password } = req.body
        const admin = await User.findOne({ email, is_admin: true })
        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password)
            if (passwordMatch) {
                req.session.admin = true
                return res.redirect('/admin')
            } else {
                res.redirect('/admin/login')
            }
        } else {
            res.redirect('/admin/login')
        }
    } catch (error) {
        console.error("error login admin", error)
        return res.redirect('/admin/error-page')
    }
}

//load dashboard
const loadDashboard = async (req, res) => {
    try {
        if (req.session.admin) {
            res.render('dashboard')
        }else{
            res.redirect('/admin/login')
        }
    } catch (error) {
        console.error('error loadin dashboard', error)
        res.redirect('/admin/error-page')
    }
}

const logout = async(req,res) => {
    try {
        req.session.destroy(err => {
            if(err) {
                console.log("error destroying admin session", err)
            }
            res.redirect('/admin/login')
        })
    } catch (error) {
        console.log("error during admin logout", error)
        res.redirect("/admin/error-page")
    }
}

module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout,
}