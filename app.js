const express = require('express')
const app = express()
const env = require('dotenv').config()
const db = require('./config/db')

db() //function for connecting db

app.listen(process.env.PORT, () => {
    console.log(`server is running on port ${process.env.PORT} `)
})

module.exports = app