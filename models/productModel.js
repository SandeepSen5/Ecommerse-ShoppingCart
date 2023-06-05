const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new Schema({
    brand: {
        type: String,
        required: true
    },
    productname: {
        type: String,
        required: true
    },
    producttype: {
        type: String,
        required: true
    }, 
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    subcategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubCategory',
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    discountPerc: {
        type: String,
        required: true
    },
    size: {
        type: String,
        required: true
    },
    images: [
        { type: String }
    ],
    stock: {
        type: Number,
        required: true,
        min: 0
    },
    deleted: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Product', productSchema);
















