const User = require("../../models/userSchema")
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')


const customerInfo = async (req, res) => {
    try {
        let search = ""
        if (req.query.search) {
            search = req.query.search
        }

        const userData = await User.find({
            is_admin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*" } },
                { email: { $regex: ".*" + search + ".*" } }
            ]
        })
        res.render('customers', {
            users: userData,
            success: req.flash('success'),
        })

    } catch (error) {
        console.log("error loading the customer Info")
    }
}

const updateStatus = async (req, res) => {
    try {
        const { userId, isBlocked } = req.body

        //update the users "is_blocked" status
        await User.findByIdAndUpdate(userId, { is_blocked: isBlocked }, { new: true })

        res.status(200).json({ message: 'User status updated successfully' });

    } catch (error) {

        console.log("error updating the user status", error)
        res.status(500).json('error updating user status')
    }
}

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password,10)
        return passwordHash
    } catch (error) {
        console.error("Error hashing password", error)
    }
}

//add user
const addUser = async(req,res) => {
    try {
        const {first_name, last_name,email,phone_no,password} = req.body

        const passwordHash = await securePassword(password)
        const newUser = new User({
            first_name,
            last_name,
            email,
            phone_no,
            password: passwordHash
        })

        await newUser.save()

        //redirect to customer page
        res.redirect('/admin/users')
    } catch (error) {
        console.error("error adding user")
        res.status(500).send("Server error")
    }
}
//delter user

const deleteUser = async(req,res) => {
    try {
        const userId = req.params.id;
    const user = await User.findByIdAndDelete(userId)

    res.redirect("/admin/users")
    } catch (error) {
        console.log("error deleting user", error)
    }
}

const editUser = async(req,res) => {
    try {
        const {_id, first_name, last_name, email, phone_no} = req.body    
        await User.findByIdAndUpdate(_id, { first_name, last_name,email, phone_no }, { new: true });


        res.redirect('/admin/users');
    } catch (error) {
        console.error("error editing the users",error)
    }   
}

module.exports = {
    customerInfo,
    updateStatus,
    addUser,
    deleteUser,
    editUser,
}