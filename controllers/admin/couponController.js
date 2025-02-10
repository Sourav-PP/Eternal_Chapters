const Coupon = require('../../models/couponSchema')
const { validationResult } = require('express-validator')

const getPage = async(req,res) => {
    try {
        const coupon = await Coupon.find()

        return res.render('couponManagement', {
            coupon,
            error: req.flash('error'),
            success: req.flash('success'),
            validationError: req.flash('validationError'),
        })
    } catch (error) {
        console.log('error loading the coupon page',error)
    }
}

//create coupon
const createCoupon = async( req, res ) => {
    try {
        console.log('its coming here!')
        const errors = validationResult(req)
        console.log('coupon error',errors)
    
        if(!errors.isEmpty()) {
            req.flash('validationError', errors.array());
            req.flash('data', req.body);
            return res.redirect('/admin/coupon-page');
        }


        const {code, max_discount_amount, minimum_purchase_amount, discount_value, coupon_type, description, limit, expiry_date} = req.body

        if(!code || !max_discount_amount || !minimum_purchase_amount || !discount_value || !coupon_type || !description || !limit || !expiry_date) {
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
            max_discount_amount,
            minimum_purchase_amount,
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

//edit coupon
const editCoupon = async(req,res)=> {
    try {

        const { coupon_id, code, discount_value, max_discount_amount, minimum_purchase_amount, coupon_type, description, limit, expiry_date, is_active } = req.body;
        console.log('coooo',coupon_id)

        const updatedCoupon = await Coupon.findByIdAndUpdate(coupon_id, {
            code,
            max_discount_amount,
            minimum_purchase_amount,
            discount_value,
            coupon_type,
            description,
            limit,
            expiry_date: new Date(expiry_date),
            is_active
          }, { new: true });
      
          if (updatedCoupon) {
            req.flash('success','coupon updated successfully')
            res.redirect('/admin/coupon-page');
          } else {
            res.status(404).send('Coupon not found');
          }
    } catch (error) {
        console.error('error editing the coupon', error);
        res.status(500).send('Error updating coupon')
    }
}

//delet the coupon
const deleteCoupon = async(req,res) => {
    try {
        const { coupon_id } = req.body;
     
        const deletedCoupon = await Coupon.findByIdAndDelete(coupon_id);

        // If the coupon is deleted successfully
        if (deletedCoupon) {
        res.redirect('/admin/coupon-page');
        } else {
        res.status(404).send('Coupon not found');
        }
    } catch (error) {
        console.error(err);
        res.status(500).send('Error deleting coupon');
    }
}

module.exports = {
    getPage,
    createCoupon,
    editCoupon,
    deleteCoupon,
}