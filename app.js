const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();
const nocache = require('nocache');
const session = require('express-session');
const flash = require('connect-flash');
const db = require('./config/db');
const userRouter = require('./routes/userRouter');
const adminRouter = require('./routes/adminRouter');
const passport = require('./config/passport');
const authRouter = require('./routes/authRouter');
const adminRoutes = require('./constants/routeConsts/adminRoutes');
const authRoutes = require('./constants/routeConsts/authRoutes');
const userRoutes = require('./constants/routeConsts/userRoutes');

db(); // connecting db

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false },
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000,
    }),
);

app.use(flash()); //flash messages
app.use(nocache());
app.set('view engine', 'ejs');

app.set('views', [
    path.join(__dirname, 'views/user'),
    path.join(__dirname, 'views/admin'),
    path.join(__dirname, 'views/partials/user'),
]);

app.use(passport.initialize());
app.use(passport.session());

app.use('/uploads', express.static('uploads'));

app.locals.adminRoutes = adminRoutes;
app.locals.authRoutes = authRoutes;
app.locals.userRoutes = userRoutes;

//Routers
app.use(authRoutes.base, authRouter);
app.use(adminRoutes.base, adminRouter);
app.use(userRoutes.base, userRouter);

//create an http server
const server = http.createServer(app);

//create a socket.io instance
const io = new Server(server);

//socket.io event handling
io.on('connection', socket => {
    console.log('A user connected');

    //custom event for cart update
    socket.on('updateCart', data => {
        console.log('cart updated', data);
        io.emit('updateClientCart', data);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`server is running on port ${process.env.PORT} `);
});

module.exports = { app, server };
