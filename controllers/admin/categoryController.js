const Category = require('../../models/categorySchema')

const categoryInfo = async(req,res) => {
    try {
        const categoryData = await Category.find()
        res.render('category', {category: categoryData})
    } catch (error) {
        console.error("error loading the categories", error)
    }
}

const addCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        const newCategory = new Category({
            name,
            description,
        });

        await newCategory.save();
        console.log('Category added successfully');
        res.redirect('/admin/categories'); // Redirect to the category list page
    } catch (error) {
        console.error('Error adding category:', error.message);
        res.status(500).send('Error adding category');
    }
};

const editCategory = async(req,res) => {
    try {
        console.log("Its comming")
        console.log("edittttttttttt:",req.body)
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
        console.log('helo')
        console.log("heheeee:",req.params)
        const {id} = req.params
        const result = await Category.findByIdAndUpdate(id,{is_deleted:true})
        console.log("soft:",result)
        
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

module.exports = {
    categoryInfo,
    addCategory,
    editCategory,
    softDelete,
    restoreCategory
}