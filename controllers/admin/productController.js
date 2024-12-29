const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')


const productInfo = async (req, res) => {
    try {
        const productdata = await Product.find()

        console.log("productData:" ,productdata)
        const categoryData = await Category.find()

        res.render("products", {
            category: categoryData,
            products: productdata
        })

    } catch (error) {
        console.log("error loading product page", error)
    }
}

//get the add product page
const getAddProduct = async (req, res) => {
    try {
        const categoryData = await Category.find()

        res.render('addProduct', {
            category: categoryData
        })
    } catch (error) {
        console.log("error loading add procuct page")
    }
}

//add product
const addProduct = async (req, res) => {
    try {
        const { title, author_name, price, available_quantity, category_id, status, language, publishing_date, publisher, page, description } = req.body
        const productExist = await Product.findOne({title: title})

        if(!productExist) {
            const images = [];
            if(req.files && req.files.length > 0) {
                for(let i=0; i<req.files.length; i++) {
                    const originalImagePath = req.files[i].path

                    const resizedImagePath = path.join(__dirname,'..', '..','uploads','product-images',req.files[i].filename)
                    await sharp(originalImagePath).resize({width:300,height:450}).toFile(resizedImagePath)
                    images.push(req.files[i].filename);
                }
            } 

            const categoryId = await Category.findOne({_id: category_id})
            if(!categoryId) {
                return res.status(400).join("Invalid category")
            }

            const newProduct = new Product({
                title,
                category_id: categoryId,
                author_name,
                price,
                available_quantity,
                description,
                publishing_date,
                publisher,
                page,
                language,
                product_imgs: images,
                status
            });

            await newProduct.save()
            return res.redirect("/admin/addProduct")

        }else{
            return res.status(400).json("Product already exist!")
        }


    } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).send("Internal Server Error");
    }
}





module.exports = {
    productInfo,
    getAddProduct,
    addProduct,
}