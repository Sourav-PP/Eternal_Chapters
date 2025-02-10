const Banner = require('../../models/bannerSchema')
const path = require('path')
const fs = require('fs')
const { error } = require('console')

const getBannerPage = async(req,res) => {
    try {
        const bannerData = await Banner.find()
        res.render('banner',{
            data: bannerData,
            success: req.flash('success'),
            error: req.flash('error')
        })
    } catch (error) {
        console.error("error loadin banner management",error)
        res.redirect('/page-error')
    }
}

//add banner
const addBanner = async(req,res) => {
    try {
        const {name, status, start_date, end_date, } = req.body
        const image = req.file
        const newBanner = new Banner({
            banner_img: image.filename,
            name,
            status,
            start_date: new Date(start_date+"T00:00:00"),
            end_date: new Date(end_date+"T00:00:00")
        })

        await newBanner.save().then(data => console.log("add bannerData:",data))

        req.flash('success','Banner has been added successfully')
        res.redirect('/admin/banners')
    } catch (error) {
        console.error("error adding banner",error)
        res.redirect('page-error')
    }
}

const deleteBanner = async(req,res) => {
    try {
        const id = req.query.id
        const bannerData = await Banner.findByIdAndDelete(id)
        const imagePath = path.join(__dirname,'../../uploads',bannerData.banner_img)
        fs.unlink(imagePath, (err) => {
            if (err) {
                console.log('error deleting banner image',err)
            }
        })
        req.flash('success','Banner has been deleted successfully')
        return res.redirect('/admin/banners')
    } catch (error) {
        console.log('error deleting banner',error)
    }
}

module.exports = {
    getBannerPage,
    addBanner,
    deleteBanner,
}