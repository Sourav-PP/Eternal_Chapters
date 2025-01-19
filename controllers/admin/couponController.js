const Coupon = require('../../models/couponSchema')

const getPage = async(req,res) => {
    try {
        const coupon = await Coupon.find()

        return res.render('couponManagement', {
            coupon,
            error: req.flash('error'),
            success: req.flash('success')
        })
    } catch (error) {
        console.log('error loading the coupon page',error)
    }
}

//create coupon
const createCoupon = async( req, res ) => {
    try {
        const {code, discount_value, coupon_type, description, limit, expiry_date} = req.body

        if(!code || !discount_value || !coupon_type || !description || !limit || !expiry_date) {
            req.flash('error', 'all fields are requried')
            return res.redirect('/admin/coupon-page')
        }

        //check if coupon already exists
        const existingCoupon = await Coupon.findOne({code})
        if(existingCoupon) {
            req.flash('error','coupon code already exist')
            return res.redirect('/admin/coupon-page')
        }

        //create new coupon
        const newCoupon = new Coupon({
            code,
            discount_value,
            coupon_type,
            description,
            limit,
            expiry_date,
        })

        await newCoupon.save()

        req.flash('success', 'coupon created successfully')
        return res.redirect('/admin/coupon-page')
    } catch (error) {
        console.log('error creating coupon',error)
        req.flash('error', 'Internal server error')
    }
}

module.exports = {
    getPage,
    createCoupon,
}