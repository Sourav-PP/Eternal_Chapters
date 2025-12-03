const userRoutes = {
    base: '/',
    notFound: '/404',
    blockedPage: '/blocked',

    profile: '/userProfile',
    updateProfile: '/updateProfile',
    // address
    addressManagement: '/addressManagement',
    addAddress: '/addAddress',
    editAddress: '/editAddress/:id',
    deleteAddress: '/deleteAddress/:id',
    // products
    productDetails: '/productDetails',
    // cart
    cartPage: '/cart-page',
    addCart: '/addCart',
    removeCartProduct: '/remove-cart-product/:id',
    updateCart: '/update-cart',
    // wishlist
    wishlist: '/wishlist',
    removeWishlist: '/remove-wishlist/:id',
    // order
    checkout: '/checkout',
    getDeliveryCharges: '/get-delivery-charges',
    getWalletBalance: '/get-wallet-balance',
    placeOrder: '/place-order',
    updatePaymentStatus: '/update-payment-status',

    success: '/success-page',
    orderHistory: '/order-history',
    retryPayment: '/retry-payment/:id',
    cancelOrder: '/cancel-order/:id/:productId',
    returnOrder: '/return-order/:id/:productId',
    applyCoupon: '/apply-coupon',
    removeCoupon: '/remove-coupon',
    generateInvoice: '/invoice/download/:id',
    // payment
    createOrder: '/create-order',
    createWalletOrder: '/create-wallet-order',
    // wallet
    walletPage: '/wallet-page',
    updateWallet: '/update-wallet',
    walletTransactionHistory: '/wallet-transction-history',
    // category
    category: '/category/:id',
};

module.exports = userRoutes;
