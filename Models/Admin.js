const mongoose = require('mongoose')
const Admin = mongoose.model('admins',{
    Name: String,
    Pass: String,
    Email: String,
    Status: String
})

module.exports = Admin