# 📚 Eternal Chapters – E-Commerce Bookstore Web Application

**Eternal Chapters** is a full-stack e-commerce bookstore web application that allows users to explore, purchase, and manage books seamlessly. The application provides a smooth shopping experience with secure authentication, cart management, coupon support, online payments, and an admin dashboard for efficient store management.

---

## 🚀 Features

### 👤 User Features
- User registration and login using **session-based authentication**
- Browse and search books
- Add books to cart and manage quantities
- Apply coupons for discounts
- Secure checkout using **Razorpay**
- Order history
- Wallet system

---

### 💳 Order & Payment Features
- Razorpay payment gateway integration
- Secure payment verification
- Order management with status updates
- Wallet refund handling for cancelled or failed orders

---

### 🧑‍💼 Admin Features
- Admin authentication
- Manage books (Add / Edit / Delete)
- Manage users
- Manage orders
- Coupon management
- Admin dashboard for monitoring store activity

---

## 🛠 Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB
- Session-based Authentication
- Razorpay Payment Gateway

### Frontend
- EJS (Embedded JavaScript Templates)
- Bootstrap CSS
- Responsive UI design

### Deployment & Cloud
- AWS EC2

---

## 🔐 Authentication & Security
- Session-based authentication using `express-session`
- Secure handling of user sessions
- Protected routes for users and admin
- Razorpay secure payment handling

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js
- MongoDB
- Razorpay account

### Steps

```bash
# Clone the repository
git clone https://github.com/Sourav-PP/Eternal_Chapters.git

# Navigate to the project directory
cd Eternal_Chapters

# Install dependencies
npm install

# Start the application
npm start
````

---

## 🔑 Environment Variables

Create a `.env` file in the root directory and add the following:

```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

---

## 🌐 Deployment

* Deployed on **AWS EC2**
* Environment variables managed securely
* Production-ready setup

---

## 👨‍💻 Author

**Sourav PP**
📧 Email: [souravpp969@gmail.com](mailto:souravpp969@gmail.com)

---

