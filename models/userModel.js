
const mongoose = require("mongoose")
const Schema = mongoose.Schema

const UserSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    password1: {
        type: String,
        required: true
    },
    blockStatus: {
        type: Boolean,
        default:false
    },
    couponsUsed: [{ type: Schema.Types.ObjectId, ref: "Coupon" }],
});

module.exports = mongoose.model('User', UserSchema)








