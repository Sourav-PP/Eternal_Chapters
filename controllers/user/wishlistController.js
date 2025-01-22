const Wishlist = require('../../models/wishlistSchema')
const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const mongoose = require('mongoose')

const getWishlist = async(req, res) => {
    try {
        const userId = req.session.user
        const wishlist = await Wishlist.findOne({user_id : userId})
        console.log(wishlist)

        if(!wishlist) {
            return res.render('wishlist',{
                wishlist: [],
                success: req.flash('success'),
                error: req.flash('error')
            })
        }

        const productIds = wishlist.products.map(item => item.product_id);

        const products = await Product.find(
            {_id: {$in : productIds}},
            'title product_imgs price'
        )

        console.log('dfdfdnnnn',products)

        return res.render('wishlist', {
            wishlist : products,
            success: req.flash('success'),
            error: req.flash('error')
        })

    } catch (error) {
        console.log('error geting wishlist page',error)
    }
}

const wishlist = async(req,res) => {
    try {
        const userId = req.session.user
        const { productId } = req.body
        console.log('dfdfdfdfdfdfdf',productId)

        // const productObjectId = new mongoose.Types.ObjectId(productId);
        let wishlist = await Wishlist.findOne({user_id: userId})

        if(!wishlist) {
            wishlist = new Wishlist({
                user_id: userId,
                products: [
                    {product_id : productId}
                ]
            })
            await wishlist.save()
            return res.status(201).json({message:'Product added to wishlist', listed: true})
        }

        //check if the product is already in the wishlist
        const productIndex = wishlist.products.findIndex((item) => item.product_id.toString() === productId)  
        
        if(productIndex >= 0) {
            wishlist.products.splice(productIndex, 1)
            await wishlist.save();
            return res.status(200).json({message: 'Product removed from the wishlist', listed: false})
        } else {
            wishlist.products.push({product_id : productId})
            await wishlist.save()
            return res.status(201).json({message:'Product added to wishlist', listed: true})
        }
    } catch (error) {
        console.log('error adding to wishlist', error)
    }
}

//remove product from wishlist
const remove = async(req,res) => {
    try {
        const productId = req.params.id
        const userId = req.session.user

        await Wishlist.updateOne(
            {user_id: userId},
            {$pull: {products:{product_id: productId}}}
        )

        req.flash('success','item removed from wishlist')
        return res.redirect('/wishlist')
    } catch (error) {
        console.log('error removing the product from wishlist', error)
    }
}

module.exports = {
    getWishlist,
    wishlist,
    remove
}