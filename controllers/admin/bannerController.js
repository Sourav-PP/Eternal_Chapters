const Banner = require('../../models/bannerSchema')
const path = require('path')
const fs = require('fs')

const getBannerPage = async(req,res) => {
    try {
        const bannerData = await Banner.find()
        res.render('banner',{
            data: bannerData
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

        res.redirect('/admin/banners')
    } catch (error) {
        console.error("error adding banner",error)
        res.redirect('page-error')
    }
}

module.exports = {
    getBannerPage,
    addBanner
}