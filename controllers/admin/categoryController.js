const Category = require('../../models/categorySchema')

const categoryInfo = async(req,res) => {
    try {
        let error = req.query.error

        if (error) {
            error = error.replace(/[&<>"'/]/g, "") // Escape special HTML characters
        }

        const categoryData = await Category.find()
        res.render('category', {
            category: categoryData,
            error: error,
            success: req.flash('success')
        })
    } catch (error) {
        console.error("error loading the categories", error)
    }
}

const addCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const categoryData = await Category.find()

        const normalizedName = name.trim().toLowerCase();

        const existingCategory = await Category.findOne({ name: { $regex: `^${normalizedName}$`, $options: 'i' } });

        if (existingCategory) {
            return res.redirect(`/admin/categories?error=${encodeURIComponent(`The category name "${name}" already exists. Please choose a different name.`)}`)
        }
        const newCategory = new Category({
            name: normalizedName,
            description,
        });

        await newCategory.save();
        
        req.flash('success', 'Category added successfully');
        res.redirect('/admin/categories'); // Redirect to the category list page
    } catch (error) {
        console.error('Error adding category:', error.message);
        res.status(500).send('Error adding category');
    }
};

const editCategory = async(req,res) => {
    try {
        
        const {_id, name, description} = req.body    
        await Category.findByIdAndUpdate(_id, { name, description }, { new: true });


        res.redirect('/admin/categories');
    } catch (error) {
        console.error("error editing the category",error)
    }
}

//soft delete
const softDelete = async(req,res) => {
    try {
        const {id} = req.params
        const result = await Category.findByIdAndUpdate(id,{is_deleted:true})
        
        res.redirect('/admin/categories')
    } catch (error) {
        console.log("error soft deleting category",error)
        res.status(500).send("Unable to delete the category")
    }
}

const restoreCategory = async(req,res) => {
    try {
        const {id} = req.params
        await Category.findByIdAndUpdate(id,{is_deleted:false})

        res.redirect('/admin/categories')
    } catch (error) {
        console.log("Error restoring the category")
        res.status(500).send("Unable to restore the category")

    }
}

//delete
const deleteCategory = async(req,res) => {
    try {
        const id = req.params.id
        await Category.findByIdAndDelete(id)
        res.redirect('/admin/categories')

    } catch (error) {
        console.log("error deleting category",error)
    }
}

module.exports = {
    categoryInfo,
    addCategory,
    editCategory,
    softDelete,
    restoreCategory,
    deleteCategory,
}