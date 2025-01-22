const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')
const { validationResult } = require('express-validator')
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')


const productInfo = async (req, res) => {
    try {
        const productdata = await Product.find()
        const categoryData = await Category.find({ is_deleted: false })

        res.render("products", {
            category: categoryData,
            products: productdata,
            success: req.flash('success')
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
            validationError: req.flash('validationError'),
            data: req.flash('data')[0] || {},
            category: categoryData,
            success: req.flash("success")
        })
    } catch (error) {
        console.log("error loading add procuct page")
    }
}

//add product
const addProduct = async (req, res) => {
    try {
        const errors = validationResult(req)

        if(!errors.isEmpty()) {
            req.flash('validationError', errors.array())
            req.flash('data', req.body)
            return res.redirect('/admin/addProduct')
        }

        const { title, author_name, price, available_quantity, category_id, status, language, publishing_date, publisher, page, description } = req.body
        const productExist = await Product.findOne({ title: title })

        if (!productExist) {
            const images = [];
            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    const originalImagePath = req.files[i].path

                    const resizedImagePath = path.join(__dirname, '..', '..', 'uploads', 'product-images', req.files[i].filename)
                    await sharp(originalImagePath).resize({ width: 300, height: 450 }).toFile(resizedImagePath)
                    images.push(req.files[i].filename);
                }
            }

            const categoryId = await Category.findOne({ _id: category_id })
            if (!categoryId) {
                return res.status(400).join("Invalid category")
            }

            const lowerCase = language.toLowerCase();
            const lowerCaseTitle = title.toLowerCase();

            const newProduct = new Product({
                title: lowerCaseTitle,
                category_id,
                author_name,
                price,
                available_quantity,
                description,
                publishing_date,
                publisher,
                page,
                language: lowerCase,
                product_imgs: images,
                status
            });

            await newProduct.save()
            req.flash("success", "Product added successfully")
            return res.redirect("/admin/addProduct")

        } else {
            return res.status(400).json("Product already exist!")
        }


    } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).send("Internal Server Error");
    }
}

//edit product page
const getEditProduct = async (req, res) => {
    try {

        const id = req.query.id;
        const productData = await Product.findOne({ _id: id })
        const categoryData = await Category.find()

        res.render('editProduct', {
            validationError: req.flash('validationError'),
            product: productData,
            category: categoryData
        })
    } catch (error) {
        console.error("error geting product edit page")
    }
}

const editProduct = async (req, res) => {
    try {
        const productId = req.params.id
        console.log('suiii',productId)
        const errors = validationResult(req)
        console.log('edit error' ,errors)

        if(!errors.isEmpty()) {
            req.flash('validationError', errors.array())
            req.flash('data', req.body)
            return res.redirect(`/admin/editProduct?id=${productId}`)
        }

        
        const { title, author_name, price, available_quantity, category_id, status, language, publishing_date, publisher, page, description } = req.body
        const productExist = await Product.findOne({ title: title })


        const categoryId = await Category.findOne({ _id: category_id })
        if (!categoryId) {
            return res.status(400).join("Invalid category")
        }

        const images = productExist.product_imgs;
        if (req.files && req.files.length > 0) {
            images = [];
            for (let i = 0; i < req.files.length; i++) {
                const originalImagePath = req.files[i].path

                const resizedImagePath = path.join(__dirname, '..', '..', 'uploads', 'product-images', req.files[i].filename)
                await sharp(originalImagePath).resize({ width: 300, height: 450 }).toFile(resizedImagePath)
                images.push(req.files[i].filename);
            }
        }

        const lowerCase = language.toLowerCase();
        const lowerCaseTitle = title.toLowerCase();

        const updateFields = {
            title: lowerCaseTitle,
            category_id,
            author_name,
            price,
            available_quantity,
            description,
            publishing_date,
            publisher,
            page,
            language: lowerCase,
            product_imgs: images,
            status
        };

        await Product.findByIdAndUpdate(productId, updateFields, { new: true })
        req.flash("success", "The product has been updated successfully")
        return res.redirect("/admin/products")
    } catch (error) {
        console.error('error updating the product!', error)
    }
}

//soft delete product
const softDeleteProduct = async (req, res) => {
    try {
        const { id } = req.params
        const result = await Product.findByIdAndUpdate(id, { is_deleted: true })

        res.redirect('/admin/products')
    } catch (error) {
        console.log("error soft deleting product", error)
        res.status(500).send("Unable to delete the product")
    }
}

//restore product
const restoreProduct = async (req, res) => {
    try {
        const { id } = req.params
        await Product.findByIdAndUpdate(id, { is_deleted: false })

        res.redirect('/admin/products')
    } catch (error) {
        console.log("Error restoring the product")
        res.status(500).send("Unable to restore the product")

    }
}

//delete the product
const deleteProduct = async (req, res) => {
    try {
        const id = req.params.id
        await Product.findByIdAndDelete(id)

        req.flash("success", "Product has been deleted successfully")
        res.redirect('/admin/products')
    } catch (error) {
        console.log('error deleting the product', error)
    }
}





module.exports = {
    productInfo,
    getAddProduct,
    addProduct,
    softDeleteProduct,
    restoreProduct,
    getEditProduct,
    editProduct,
    deleteProduct,
}