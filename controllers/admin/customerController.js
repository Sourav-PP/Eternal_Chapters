const User = require("../../models/userSchema")

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
        res.render('customers', { users: userData })

    } catch (error) {
        console.log()
    }
}

const updateStatus = async (req, res) => {
    console.log("POST /update-status triggered");
    try {
        console.log("request bodu of toggle", req.body)
        const { userId, isBlocked } = req.body


        //update the users "is_blocked" status
        await User.findByIdAndUpdate(userId, { is_blocked: isBlocked }, { new: true })
        res.status(200).json({ message: "User status updated successfully" })

    } catch (error) {

        console.log("error updating the user status", error)
        res.status(500).json('error updating user status')
    }
}

//add user
const addUser = async(req,res) => {
    try {
        const {first_name, last_name,email,phone_no,password} = req.body
        console.log('add user body',req.body)

        const newUser = new User({
            first_name,
            last_name,
            email,
            phone_no,
            password
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
        console.log('deleteeeeeeeeee')
        const userId = req.params.id;
    const user = await User.findByIdAndDelete(userId)

    res.redirect("/admin/users")
    } catch (error) {
        console.log("error deleting user", error)
    }
}



// //edit user
// const editUser = async (req, res) => {
//     const { id, firstName, secondName, dob, email, phone, password, adminStatus } = req.body;

//   try {
//     // Find the user by ID
//     const user = await User.findById(id);

//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     // Update the user fields
//     user.first_name = firstName;
//     user.last_name = secondName;
//     user.date_of_birth = dob;
//     user.email = email;
//     user.phone_no = phone;
//     user.password = password; // You should hash the password before saving it
//     user.is_admin = adminStatus === 'admin'; // Check if the adminStatus is 'admin' or 'user'

//     // Save the updated user
//     await user.save();

//     // Respond with success message
//     res.json({ message: 'User updated successfully' });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Error updating user' });
//   }
// };




module.exports = {
    customerInfo,
    updateStatus,
    addUser,
    deleteUser
    // editUser
}