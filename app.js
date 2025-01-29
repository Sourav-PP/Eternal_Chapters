const express = require('express')
const app = express()
const http = require('http')
const { Server } = require('socket.io')
const path = require('path')
const env = require('dotenv').config()
const nocache = require('nocache')
const session = require('express-session')
const flash = require('connect-flash');
const db = require('./config/db')
const userRouter = require('./routes/userRouter')
const adminRouter = require('./routes/adminRouter')
const passport = require('./config/passport')
const authRouter = require('./routes/authRouter')

db() //function for connecting db

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
    httpOnly: true,
    maxAge: 72 * 60 * 60 * 1000
}))

app.use(flash()); //flash messages
app.use(nocache())
app.set("view engine", "ejs")

app.set("views", [
    path.join(__dirname, 'views/user'),
    path.join(__dirname, 'views/admin'),
    path.join(__dirname, 'views/partials/user')
])

app.use(express.static(path.join(__dirname, 'public')));

app.use(passport.initialize());
app.use(passport.session());

app.use('/uploads', express.static('uploads'));

//Routers
app.use('/auth', authRouter);
app.use('/admin', adminRouter)
app.use('/', userRouter)

//create an http server
const server = http.createServer(app);

//create a socket.io instance
const io = new Server(server);

//socket.io event handling
io.on('connection', (socket) => {
    console.log("A user connected");

    //custon event for cart update
    socket.on('updateCart', (data) => {
        console.log('cart updated', data);
        io.emit('updateClientCart', data);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

server.listen(process.env.PORT, () => {
    console.log(`server is running on port ${process.env.PORT} `)
})

module.exports = { app, server }