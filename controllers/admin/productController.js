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
    let productId
    try {
        productId = req.params.id;
        const errors = validationResult(req);

        if(!errors.isEmpty()) {
            req.flash('validationError', errors.array())
            req.flash('data', req.body)
            return res.redirect(`/admin/editProduct?id=${productId}`)
        }

        const { 
            title, author_name, price, available_quantity, 
            category_id, status, language, publishing_date, 
            publisher, page, description, 
            delete_images, existing_images
        } = req.body;

        const productExist = await Product.findById(productId);
        if (!productExist) {
            return res.status(404).send('Product not found');
        }

        const categoryId = await Category.findOne({ _id: category_id });
        if (!categoryId) {
            return res.status(400).send("Invalid category");
        }

        // Convert existing_images to array if it's not already
        const existingImagesArray = Array.isArray(existing_images) ? existing_images : [existing_images];

        // Create a map of current images with their positions
        const currentImagesMap = new Map();
        existingImagesArray.forEach((img, index) => {
            if (img) currentImagesMap.set(img, index);
        });

        // Handle deleted images
        if (delete_images) {
            const imagesToDelete = Array.isArray(delete_images) 
                ? delete_images.map(img => decodeURIComponent(img))
                : [decodeURIComponent(delete_images)];
            
            // Remove deleted images from filesystem
            imagesToDelete.forEach(imgName => {
                const imagePath = path.join(__dirname, '..', '..', 'uploads', 'product-images', imgName);
                try {
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                        console.log('Deleted file:', imgName);
                    }
                } catch (err) {
                    console.error('Error deleting file:', imgName, err);
                }
            });

            // Remove deleted images from the map
            imagesToDelete.forEach(img => currentImagesMap.delete(img));
        }

        // Process new images
        const newImages = [];
        if (req.files && req.files.length > 0) {
            for (let file of req.files) {
                const originalImagePath = file.path;
                const resizedImagePath = path.join(__dirname, '..', '..', 'uploads', 'product-images', file.filename);
                
                try {
                    await sharp(originalImagePath)
                        .resize({ width: 300, height: 450 })
                        .toFile(resizedImagePath);

                    if (fs.existsSync(originalImagePath)) {
                        fs.unlinkSync(originalImagePath);
                    }
                    
                    newImages.push(file.filename);
                } catch (error) {
                    console.error('Error processing image:', file.filename, error);
                    continue;
                }
            }
        }

        // Create final images array maintaining order
        const finalImages = new Array(4).fill(null);
        
        // First, place existing images in their original positions
        for (const [img, pos] of currentImagesMap.entries()) {
            if (pos < 4) finalImages[pos] = img;
        }
        
        // Then, fill empty slots with new images
        let newImageIndex = 0;
        for (let i = 0; i < 4; i++) {
            if (finalImages[i] === null && newImageIndex < newImages.length) {
                finalImages[i] = newImages[newImageIndex++];
            }
        }

        // Remove null values
        const images = finalImages.filter(img => img !== null);

        const updateFields = {
            title: title.toLowerCase(),
            category_id,
            author_name,
            price,
            available_quantity,
            description,
            publishing_date,
            publisher,
            page,
            language: language.toLowerCase(),
            product_imgs: images,
            status
        };

        const result = await Product.updateOne(
            { _id: productId },
            { 
                $set: updateFields,
                $currentDate: { updated_at: true }
            }
        );

        if (!result.modifiedCount) {
            console.log('Warning: No changes were made to the document');
        }

        req.flash("success", "The product has been updated successfully");
        return res.redirect("/admin/products");
    } catch (error) {
        console.error('Error updating the product!', error);
        req.flash('error', 'Failed to update the product');
        return res.redirect(`/admin/editProduct?id=${productId}`);
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