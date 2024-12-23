

const page_404 = async (req, res) => {
    try {
        // Set 404 status code and render the custom 404 page
        res.status(404).render('page_404');
    } catch (error) {
        console.error('Error rendering 404 page:', error);
        // Fallback response for server-side issues
        res.status(500).send('An error occurred while displaying the 404 page.');
    }
};

const loadHomepage = async(req,res) => {
    try {
        return res.render('home')
    } catch (error) {
        console.log('user home page error',error.message);
        res.status(500).send('Server error')
    }
}

module.exports = {
    loadHomepage,
    page_404
}