const Offer = require('../../models/offerSchema')
const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const { validationResult } = require('express-validator')

//offer management page
const getOfferManagement = async(req,res) => {
    try {
        const offers = await Offer.find().sort({createdAt: -1})

        return res.render('offerManagement',{
            offers,
            success: req.flash('success'),
            error: req.flash('error')
        })

    } catch (error) {
        console.log('error loading the offer management',error)
    }
}

//get create offers
const getCreateOffer = async(req,res) => {
    try {
        res.render('createOffer', {
            validationError: req.flash('validationError'),
        })
    } catch (error) {
        console.log('error getin the offer create page',error)
    }
}

//create offers
const createOffer = async(req,res) => {
    try {
        const errors = validationResult(req)

        if(!errors.isEmpty()) {
            req.flash('validationError', errors.array());
            req.flash('data', req.body);
            return res.redirect('/admin/create-offer');
        }
        const {name, offer_type, discount_value, start_date, end_date, status } = req.body

        //create new offer
        const newOffer = new Offer({
            name,
            offer_type,
            discount_value,
            start_date,
            end_date,
            status
        })

        await newOffer.save()

        req.flash('success','offer created successfully')
        return res.redirect('/admin/offer-management')
    } catch (error) {
        console.log('error creating the offer',error)
    }
}

//get edit offer
const getEditOffer = async(req,res) => {
    try {
        const offerId = req.params.id
        const offer = await Offer.findById(offerId)
        
        return res.render('editOffer',{
            offer,
            validationError: req.flash('validationError'),
        })
    } catch (error) {
        console.log('error loading edit offer',error)
    }
}

//edit offer
const editOffer = async(req,res) => {
    try {
        const offerId = req.params.id

        const errors = validationResult(req)

        if(!errors.isEmpty()) {
            req.flash('validationError', errors.array());
            req.flash('data', req.body);
            return res.redirect(`/admin/edit-offer/${offerId}`);
        }

        
        const {name, offer_type, discount_value, start_date, end_date, status} = req.body

        const updateOffer = await Offer.findByIdAndUpdate(offerId, {
            name,
            offer_type,
            discount_value,
            start_date,
            end_date,
            status,
        })

        await updateOffer.save()

        req.flash('success','Offer updated successfully')
        return res.redirect('/admin/offer-management')
    } catch (error) {
        console.log('error editing the offer',error)
    }
}

//delete offer
const deleteOffer = async(req,res) => {
    try {
        const {offer_id} = req.body

        await Offer.findByIdAndDelete(offer_id)

        req.flash('success','offer deleted successfylly')
        return res.redirect('/admin/offer-management')
    } catch (error) {
        console.log('error deleting the offer', error)
    }
}

// get the add offer for product
const getAddOfferProduct = async(req,res) => {
    try {
        const productId = req.query.id
        const offers = await Offer.find({status: 'active', offer_type: 'product'})
        const product = await Product.findById(productId)
        return res.render('addOfferProduct',{
            product,
            offers,
            error: req.flash('error')
        })
    } catch (error) {
        console.log('error loadin add offer page', error)
    }
}

//apply offer to the product
const applyOfferProduct = async(req,res) => {
    try {
        const {productId, offerId} = req.body;

        const product = await Product.findById(productId)
        
        if(product.offer_id?.toString() === offerId) {
            req.flash('error','offer already exist for this product')
            return res.redirect(`/admin/add-offer-product?id=${productId}`)
        }

        await Product.findByIdAndUpdate(productId, {$set: {offer_id: offerId}})
        req.flash('success','Offer added successfully')
        return res.redirect('/admin/products')
    } catch (error) {
        console.log('error applying offer to the product',error)
    }
}

//reomve offer from the product
const removeOfferProduct = async(req,res) => {
    try {
        const productId = req.query.id

        await Product.findByIdAndUpdate(productId, {$unset: {offer_id: ""}})
        req.flash('success', 'Offer removed successfully');
        return res.redirect('/admin/products');
    } catch (error) {
        console.log('error removing offer from the product',error)
    }
}

// get the add offer page for category
const getAddOfferCategory = async(req,res) => {
    try {
        const categoryId = req.query.id
        const offers = await Offer.find({offer_type: 'category', status: 'active'})
        const category = await Category.findById(categoryId)

        return res.render('addOfferCategory',{
            category,
            offers,
            error: req.flash('error')
        })
    } catch (error) {
        console.log('error loading the addOfferCategory',error)
    }
}

//apply offer to the category
const applyOfferCategory = async(req,res) => {
    try {
        const {categoryId, offerId} = req.body
        
        const category = await Category.findById(categoryId)

        if(category.offer_id?.toString() === offerId) {
            req.flash('error','offer already exist for this category')
            return res.redirect(`/admin/add-offer-category?id=${categoryId}`)
        }

        await Category.findByIdAndUpdate(categoryId, {$set: {offer_id: offerId}})
        req.flash('success',    'Offer added successfully')
        return res.redirect('/admin/categories')
    } catch (error) {
        console.log('error applying offer to the category',error)
    }
}

//remove offer for category
const removeOfferCategory = async(req,res) => {
    try {
        const categoryId = req.query.id
        
        await Category.findByIdAndUpdate(categoryId, { $unset: { offer_id: "" } });
        req.flash('success', 'Offer removed successfully');
        return res.redirect('/admin/categories');
    } catch (error) {
        console.log('error removing the category offer' ,error)
    }
}



module.exports = {
    getAddOfferProduct,
    applyOfferProduct,
    getOfferManagement,
    getCreateOffer,
    createOffer,
    getEditOffer,
    editOffer,
    deleteOffer,
    getAddOfferCategory,
    applyOfferCategory,
    removeOfferCategory,
    removeOfferProduct,
}
