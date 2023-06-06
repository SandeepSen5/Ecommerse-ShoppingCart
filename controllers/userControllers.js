var express = require('express');
var router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const flash = require('express-flash');
const bcrypt = require('bcryptjs');
const ObjectId = mongoose.Types.ObjectId;
const Razorpay = require('razorpay');


//usermodel Database   
const User = require('../models/userModel');
const Product = require('../models/productModel');
const OTP = require('../models/otpSchema');
const Cart = require("../models/cartSchema");
const Address = require("../models/addressSchema");
const Order = require("../models/orderSchema");
const Coupon = require("../models/couponSchema");
const Banner = require("../models/bannerSchema");
const Wallet = require("../models/walletSchema");


const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_SERVICE_SSID
const client = require('twilio')(accountSid, authToken);


var instance = new Razorpay({
    key_id: process.env.key_id,
    key_secret: process.env.key_secret,
});


exports.isLogin = async (req, res, next) => {
    try {
        let user = req.session.user;
        if (user) {
            next();
        } else {
            res.redirect("/user/user-login");
        }
    } catch (error) {
        console.log(error.message);
    }
};


exports.cartCount = async (req, res, next) => {
    try {
        let user = req.session.userid;
        let cartCount = 0;
        if (user) {
            const cart = await Cart.findOne({ userId: user }); // Await the query to get the cart object

            if (cart) {
                // Replace cart.products.length with cart.products.reduce((acc, product) => acc + product.quantity, 0)
                cartCount = cart.products.reduce(
                    (acc, product) => acc + product.quantity,
                    0
                );
                console.log(cartCount);
            }
        }
        req.cartCount = cartCount;
        // res.locals.cartCount = cartCount; // Set cartCount as a property on req object
        next();
    } catch (error) {
        console.log(error);
    }
};


exports.userindex = async (req, res) => {
    const user = req.session.user;
    const cartCount = req.cartCount;
    console.log(cartCount);


    // Pagination variables
    const page = parseInt(req.query.page) || 1; // Current page number
    const limit = 6; // Number of products per page
    const skip = (page - 1) * limit; // Number of products to skip


    let sortOption = req.query.sort || 'price'; // Default sort by price (Low to High)
    let sortDirection = 1; // 1 for ascending, -1 for descending


    // Adjust the sortDirection based on the selected sort option
    if (sortOption === 'price-desc') {
        sortDirection = -1; // Sort by price (High to Low)
    }

    const searchInput = req.query.search;
    console.log(searchInput)
    try {

        const searchQuery = {
            deleted: false,
            $or: [
                { brand: { $regex: new RegExp(searchInput, 'i') } },
                { productname: { $regex: new RegExp(searchInput, 'i') } },
                { producttype: { $regex: new RegExp(searchInput, 'i') } }
            ]
        };
        console.dir(searchQuery, { depth: null });
        // Retrieve products with pagination
        const totalProducts = await Product.countDocuments({ deleted: false });
        const totalPages = Math.ceil(totalProducts / limit);

        let products = await Product.find({ deleted: false })
            .sort({ price: sortDirection })
            .skip(skip)
            .limit(limit)
            .maxTimeMS(20000)
            .exec();

        if (searchInput) {
            console.log('ddddddddddddddd')
            products = await Product.find(searchQuery)
                .sort({ price: sortDirection })
                .skip(skip)
                .limit(limit)
                .maxTimeMS(20000)
                .exec();
            console.log(products)
        }

        let banners = await Banner.find({});

        res.render('user/user-index', {
            other: false,
            admin: false,
            products,
            user,
            cartCount,
            totalPages,
            currentPage: page,
            banners,
        });
    } catch (error) {
        console.error(error);
        res.render('error-page'); // Render an error page or handle the error as needed
    }
};



exports.getuserindex = async (req, res) => {
    const cartCount = req.cartCount;
    // Pagination variables
    const page = parseInt(req.query.page) || 1; // Current page number
    const limit = 6; // Number of products per page
    const skip = (page - 1) * limit; // Number of products to skip

    let sortOption = req.query.sort || 'price'; // Default sort by price (Low to High)
    let sortDirection = 1; // 1 for ascending, -1 for descending

    const searchInput = req.query.search;

    const searchQuery = {
        deleted: false,
        $or: [
            { brand: { $regex: new RegExp(searchInput, 'i') } },
            { productname: { $regex: new RegExp(searchInput, 'i') } },
            { producttype: { $regex: new RegExp(searchInput, 'i') } }
        ]
    };

    // Adjust the sortDirection based on the selected sort option
    if (sortOption === 'price-desc') {
        sortDirection = -1; // Sort by price (High to Low)
    }

    console.log(cartCount)
    if (req.session.user) {
        let user = req.session.user;
        let banners = await Banner.find({});
        console.log(banners)
        const totalProducts = await Product.countDocuments({ deleted: false });
        const totalPages = Math.ceil(totalProducts / limit);
        let products = await Product.find({ deleted: false })
            .sort({ price: sortDirection })
            .skip(skip)
            .limit(limit)
            .maxTimeMS(20000)
            .exec();

        if (searchInput) {
            products = await Product.find(searchQuery)
                .sort({ price: sortDirection })
                .skip(skip)
                .limit(limit)
                .maxTimeMS(20000)
                .exec();
            console.log(products)
        }

        res.render('user/user-index', {
            other: false,
            admin: false,
            products,
            user,
            cartCount,
            totalPages,
            currentPage: page,
            banners,
        });

    } else {
        res.redirect('/user/user-login');
    }
}


exports.userlogin = function (req, res) {
    if (req.session.loggedIn) {
        res.redirect('/user/user-index')
    } else {
        res.render('user/user-login', { other: true });
    }
}


exports.postuserlogin = async function (req, res) {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email: email }).maxTimeMS(20000);
        let userBlock = await User.findOne({ email: email, blockStatus: true });
        if (userBlock) {
            req.flash('error_msg', 'User Blocked');
            return res.redirect('/user/user-login');
        }
        if (!user) {
            req.flash('error_msg', 'Invalid Credentials');
            return res.redirect('/user/user-login');
        }
        let isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            req.session.loggedIn = true;
            req.session.user = user.name;
            req.session.userid = user._id;
            return res.redirect('/user/user-index');
        } else {
            req.flash('error_msg', 'Invalid Password');
            return res.redirect('/user/user-login');
        }
    } catch (err) {
        console.log(err.message);
        res.status(500).send('Server error')
    }
}


exports.usersignup = function (req, res) {
    if (req.session.user) {
        res.redirect('/user/user-index')
    }
    else {
        res.render('user/user-signup', { other: true });
    }
}

exports.postusersignup = async function (req, res) {
    console.log("sign");
    const { name, email, phone, password, password1 } = req.body;
    let errors = [];

    // check passwords match
    if (password !== password1) {
        errors.push({ msg: 'Passwords do not match' });
    }

    // check password length
    if (password.length < 6) {
        errors.push({ msg: 'Password must be at least 6 characters' });
    }

    // check phone number
    if (!phone || !phone.match(/^\d{10}$/)) {
        errors.push({ msg: 'Phone number must contain 10 digits' });
    }

    // check email format
    if (!email || !email.match(/\S+@\S+\.\S+/)) {
        errors.push({ msg: 'Invalid email format' });
    }

    if (errors.length > 0) {
        // If there are any errors, render the signup page with the error messages and form data
        res.render('user/user-signup', {
            errors,
            name,
            email,
            phone,
            password,
            password1
        });
    } else {
        // If there are no errors, try to find a user with the same email in the database
        try {
            const user = await User.findOne({ email: email });
            if (user) {
                // If a user with the same email already exists, show an error message
                errors.push({ msg: 'Email already exists' });
                res.render('user/user-signup', {
                    errors,
                    name,
                    email,
                    phone,
                    password,
                    password1
                });
            } else {
                // If the email is not already registered, create a new user object with hashed password and save it to the database
                const hashedPassword = await bcrypt.hash(password, 10);

                req.session.name = name;
                req.session.email = email;
                req.session.phone = phone;
                req.session.password = password;

                const number = req.session.phone;

                try {
                    // Send the OTP to the user's number (twilio)
                    await client.verify.v2.services(verifySid).verifications.create({ to: `+91${number}`, channel: "sms" });
                    res.render("user/user-otpverify", { other: true });
                } catch (error) {
                    console.log(error);
                    res.status(500).send("Failed to send OTP. Please try again later.");
                }
            }
        } catch (err) {
            console.log(err);
            res.status(500).send('Internal server error');
        }
    }
}


exports.getsingleproduct = async (req, res) => {
    const cartCount = req.cartCount;
    let id = req.params.id;
    if (req.session.user) {
        let user = req.session.user;
        let singleProduct = await Product.findOne({ _id: id });
        res.render('user/userSingleProduct', { user, singleProduct, cartCount });
    }
    else {
        res.redirect('/user/user-login');
    }
}


exports.userotp = (req, res) => {
    res.render('user/user-otp', { other: true })
}


exports.postuserotp = async (req, res) => {
    const number = req.body.number;
    req.session.phone = number;
    let user = await User.findOne({ phone: number }).maxTimeMS(20000);
    if (!user) {
        req.flash('error_msg', 'User Not Registered');
        return res.redirect('/user/user-login');
    }
    req.session.loggedIn = true;
    req.session.user = user.name;
    req.session.userid = user._id;

    try {
        // Send the OTP to the user's number (twilio)
        await client.verify.v2.services(verifySid).verifications.create({ to: `+91${number}`, channel: "sms" });
        res.render("user/user-loginootpverify", { other: true });
    } catch (error) {
        console.log(error);
        res.status(500).send("Failed to send OTP. Please try again later.");
    }
}

exports.loginootpverify = (req, res) => {
    res.render('user/user-loginootpverify', { other: true })
}

exports.postloginootpverify = async (req, res) => {
    let errors = [];
    const otp = req.body.code;
    const phone = req.session.phone;
    console.log(phone)
    try {
        let response = await client.verify.v2.services(verifySid).verificationChecks.create({ to: `+91${phone}`, code: otp })
        if (response.valid) {
            // req.session.loggedIn = true;
            // req.session.user = user.name;
            // req.session.userid = user._id;
            return res.redirect('/user/user-index');
        } else {
            errors.push({ msg: 'Invalid OTP' });
            res.render("user/user-loginootpverify", { other: true, errors });
        }
    } catch (error) {
        console.log(error);
        errMessage = "Cant validate OTP"
        res.redirect('/user/user-login');
    }
}


exports.userotpverify = (req, res) => {
    res.render('user/user-loginootpverify', { other: true })
}


exports.postuserotpverify = async (req, res) => {
    let errors = [];
    const otp = req.body.code;
    const name = req.session.name
    const email = req.session.email;
    const phone = req.session.phone;
    const password = req.session.password;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        let response = await client.verify.v2.services(verifySid).verificationChecks.create({ to: `+91${phone}`, code: otp })
        if (response.valid) {
            const newUser = new User({
                name,
                email,
                phone,
                password: hashedPassword,
                password1: hashedPassword
            });
            await newUser.save();
            req.session.user = name;
            req.session.user.loggedIn = true;
            const newWallet = new Wallet({
                userId: newUser._id,
            })

            await newWallet.save();
            res.redirect('/user/user-index')
        } else {
            errors.push({ msg: 'Invalid OTP' });
            res.render("user/user-otpverify", { other: true, errors });
        }
    } catch (error) {
        console.log(error);
        errMessage = "Cant validate OTP"
        res.redirect('/user/user-otpverify');
    }
}


exports.resendotp = async (req, res) => {
    const number = req.session.phone;
    try {
        // Send the OTP to the user's number (twilio)
        await client.verify.v2.services(verifySid).verifications.create({ to: `+91${number}`, channel: "sms" });
        res.redirect('/user/user-otpverify')
    } catch (error) {
        console.log(error);
        res.status(500).send("Failed to send OTP. Please try again later.");
    }

}


exports.userlogout = (req, res) => {
    req.session.user = null;
    req.session.loggedIn = false;
    res.redirect('/user/user-login')
}


exports.userprofile = async (req, res) => {
    const cartCount = req.cartCount;
    let userid = req.session.userid;
    console.log(cartCount)
    let user = req.session.user;
    let userdetails = await User.find({ _id: userid });
    console.log(userdetails);
    res.render('user/user-profile', { other: false, admin: false, userdetails, user, cartCount })
}


exports.postuserprofile = async (req, res) => {
    const cartCount = req.cartCount;
    console.log(req.body)
    const userId = req.session.userid;
    const { name, email, phone } = req.body;
    const emailexist = await User.findOne({ email: req.body.email })

    try {
        if (emailexist && emailexist._id.toString() !== userId) {
            res.json({ success: false, message: "Email Already Registered" })
        } else {
            const user = await User.findByIdAndUpdate(
                userId,
                { name, email, phone },
                { new: true }
            );
            req.session.user = req.body.name
            res.json({ success: true });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}


exports.homeaddress = async (req, res) => {
    let user = req.session.user;
    let userId = req.session.userid;
    userId = userId.toString();
    console.log(userId)
    const cartCount = req.cartCount;
    const addressData = await Address.find({ user: userId });
    console.log(addressData)
    let address = null;
    try {
        if (addressData && addressData.length > 0) {
            address = addressData[0].address;
        }
        res.render("user/user-homeaddress", {
            admin: false,
            user,
            cartCount,
            address,
        });
    } catch (error) {
        console.log(error);
    }
    req.session.address = null;
}


exports.passwordprofile = async (req, res) => {
    try {
        let verifiedUser = await User.findOne({ _id: req.session.userid });
        console.log(req.body.password, "ssssssssssssssssss");
        const status = await bcrypt.compare(req.body.password, verifiedUser.password);
        if (req.body.password.length < 6) {
            status = false;
        }
        if (status) {
            console.log(status, "para");
            let hashPassword = await bcrypt.hash(req.body.password1, 10);
            await User.findOneAndUpdate(
                { _id: req.session.userid }, // filter object
                { password: hashPassword } // update object
            );
            console.log("huihadsfasdfasd");
            res.json({ success: true });
        } else {
            console.log("password is not matching");
            res.json({ success: false });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error." });
    }
}


exports.posthomeaddress = async (req, res) => {
    console.log(req.session.user, "/////////");
    let cartCount = req.cartCount;
    let user = req.session.userid;
    let addaddress = {
        name: req.body.name,
        state: req.body.state,
        streetaddress: req.body.streetaddress,
        appartment: req.body.appartment,
        town: req.body.town,
        zip: req.body.zip,
        mobile: req.body.mobile,
        email: req.body.email,
        radio: req.body.radio,
    }
    console.log(addaddress)
    try {
        const data = await Address.findOne({ user: user });
        if (data) {
            data.address.push(addaddress);
            const updated_data = await Address.findOneAndUpdate(
                { user: user },
                { $set: { address: data.address } },
                { returnDocument: "after" }
            );
            console.log(updated_data, "updated address collection");
        } else {
            const address = new Address({
                user: req.session.userid,
                address: [addaddress],
            });
            const addressdata = await address.save();
        }
        res.redirect('/user/user-homeaddress')
    } catch (error) {
        console.log(error);
    }
}


exports.edithomeaddress = async (req, res) => {
    try {
        let user = req.session.user;
        const cartCount = req.cartCount;
        console.log(req.params.id); // Check if id is coming in params
        const address = await Address.findOne({ "address._id": req.params.id });
        const selectedAddress = address.address.find(
            (addr) => addr._id.toString() === req.params.id
        );
        console.log(selectedAddress, "selectedAddress");
        res.render("user/user-edithomeaddress", {
            user,
            cartCount,
            address: selectedAddress,
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
}


exports.postedithomeaddress = async (req, res) => {
    try {
        const userId = req.session.userid;
        const addressId = req.params.id;
        console.log(userId);
        console.log(addressId);
        const user = await Address.findOne({ user: userId });
        const address = user.address.find((a) => a._id.toString() === addressId);
        console.log(address, "address got");
        const updatedAddress = {
            name: req.body.name,
            state: req.body.state,
            streetaddress: req.body.streetaddress,
            appartment: req.body.appartment,
            town: req.body.town,
            zip: req.body.zip,
            mobile: req.body.mobile,
            email: req.body.email,
            radio: req.body.radio,
        };
        const result = await Address.updateOne(
            { user: userId, "address._id": new ObjectId(addressId) },
            { $set: { "address.$": updatedAddress } }
        );
        console.log(result);
        res.redirect('/user/user-homeaddress');
    } catch (error) {
        console.log(error);
        res.status(500).send("Server Error");
    }
}


exports.mens = async (req, res) => {
    let user = req.session.user;
    const cartCount = req.cartCount;
    let banners = await Banner.find({});
    let products = await Product.find({ producttype: "Mens", deleted: false }).maxTimeMS(30000);
    console.log(products);
    if (req.session.user) {
        res.render('user/mens', { admin: false, products, user, cartCount, banners })
    } else {
        res.redirect('/user/user-login')
    }
}


exports.kids = async (req, res) => {
    let user = req.session.user;
    const cartCount = req.cartCount;
    let banners = await Banner.find({});
    let products = await Product.find({ producttype: "Kids" ,deleted: false  }).maxTimeMS(30000);
    console.log(products);
    if (req.session.user) {
        res.render('user/kids', { admin: false, products, user, cartCount, banners })
    } else {
        res.redirect('/user/user-login')
    }
}


exports.womens = async (req, res) => {
    let user = req.session.user;
    const cartCount = req.cartCount;
    let banners = await Banner.find({});
    let products = await Product.find({ producttype: "Womens",deleted: false  }).maxTimeMS(30000);
    console.log(products);
    if (req.session.user) {
        res.render('user/womens', { admin: false, products, user, cartCount, banners })
    } else {
        res.redirect('/user/user-login')
    }
}


exports.addtocart = async (req, res) => {
    const productId = new ObjectId(req.params.id);
    const userId = req.session.userid; // assuming you have the user id here
    try {
        let product = await Product.findOne({ _id: productId });

        // Check if product is out of stock
        if (product.stock === 0) {
            return res.json({ message: "Product is out of stock", status: false });
        }

        let proPrice = product.price;
        let taxAmount = Math.floor((proPrice / 100) * 9);

        const quantity = 1;
        let proObj = {
            item: productId,
            quantity: quantity,
            currentPrice: proPrice,
            tax: taxAmount,
            size: req.query.size,
            deliverystatus: 'not-shipped',
            orderstatus: 'processing'
        };

        let userCart = await Cart.findOne({ userId: new ObjectId(userId) });

        if (userCart) {
            let proExist = userCart.products.findIndex(
                (product) => product.item.equals(productId) && product.size === req.query.size
            );

            if (proExist > -1) {
                await Cart.updateOne(
                    { userId, "products.item": productId, "products.size": req.query.size },
                    { $inc: { "products.$.quantity": 1 } }
                );
            } else {
                await Cart.updateOne({ userId }, { $push: { products: proObj } });
            }
        } else {
            const cartObj = new Cart({
                userId: userId,
                products: [proObj],
            });

            await Cart.create(cartObj);
        }

        // Decrease the stock by 1
        await Product.findByIdAndUpdate(productId, { $inc: { stock: -1 } });

        res.json({ status: true });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
    }
};



exports.getcartproduct = async (req, res) => {
    let user = req.session.user;
    let userId = req.session.userid;
    userId = userId.toString();
    let cartItems = [];
    try {
        cartItems = await Cart.aggregate([
            {
                $match: { userId },
            },
            {
                $unwind: "$products",
            },
            {
                $project: {
                    item: { $toObjectId: "$products.item" },
                    quantity: "$products.quantity",
                    size: '$products.size',
                    currentPrice: '$products.currentPrice',
                    tax: '$products.tax',
                    unique_id: '$products._id'
                },
            },
            {
                $lookup: {
                    from: "products",
                    localField: "item",
                    foreignField: "_id",
                    as: "productInfo",
                },
            },
            {
                $project: {
                    unique_id: 1,
                    item: 1,
                    quantity: 1,
                    size: 1,
                    currentPrice: 1,
                    tax: 1,
                    productInfo: { $arrayElemAt: ["$productInfo", 0] },
                },
            },
        ]);

        let total = await Cart.aggregate([
            {
                $match: { userId },
            },
            {
                $unwind: "$products",
            },
            {
                $project: {
                    item: { $toObjectId: "$products.item" },
                    quantity: "$products.quantity",
                    size: '$products.size',
                    currentPrice: '$products.currentPrice',
                    tax: '$products.tax',
                },
            },
            {
                $lookup: {
                    from: "products",
                    localField: "item",
                    foreignField: "_id",
                    as: "productInfo",
                },
            },
            {
                $project: {
                    item: 1,
                    quantity: 1,
                    size: 1,
                    currentPrice: 1,
                    tax: 1,
                    productInfo: { $arrayElemAt: ["$productInfo", 0] },
                },
            },
            {
                $group: {
                    _id: null,
                    totalTax: { $sum: { $multiply: ['$quantity', '$tax'] } },
                    total: { $sum: { $multiply: ['$quantity', '$currentPrice'] } },
                    totalWithTax: { $sum: { $multiply: ['$quantity', { $add: ['$tax', '$currentPrice'] }] } }
                    // total: { $sum: { $multiply: ["$quantity", "$productInfo.price"] } },
                },
            },
        ]);

        let subtotal = 0;
        let tax = 0;
        let totalWithTax = 0;
        if (total.length > 0) {
            subtotal = total[0].total;
            tax = total[0].totalTax;
            totalWithTax = total[0].totalWithTax;
        }

        const cartCount = req.cartCount;
        res.render("user/cart", {
            cartItems,
            user,
            userId,
            cartCount,
            total,
            subtotal,
            tax,
            totalWithTax

        });
    } catch (error) {
        console.log(error, "helooooo");
    }
};


exports.changeProductQuantity = async (req, res) => {
    try {
        const response = {};
        let cart = req.body.cart;
        console.log(cart, "...........");
        let count = req.body.count;
        let quantity = req.body.quantity;
        let unique_id = new ObjectId(req.body.product);
        count = parseInt(count);
        quantity = parseInt(quantity);
        console.log(count, "//////////");
        console.log(quantity, "??????????");
        if (count == -1 && quantity == 1) {
            // stock management
            const cartstock = await Cart.findOne({ _id: req.body.cart });
            const product = cartstock.products.find((item) => item._id.equals(unique_id));
            console.log(product, "sssssssssssssssss")
            await Product.updateOne(
                { _id: product.item },
                { $inc: { stock: 1 } }
            );
            await Cart.updateOne(
                {
                    _id: req.body.cart,
                    "products._id": unique_id,
                },
                {
                    $pull: { products: { _id: unique_id } },
                }
            );
            res.json({ removeProduct: true, status: false });
        } else {
            // stock management
            let cartstock = await Cart.findOne({ _id: req.body.cart });
            let product = cartstock.products.find((item) => item._id.equals(unique_id));
            let productstock = await Product.findOne({ _id: product.item });
            console.log(product, "sssssssssssssssss")
            console.log(productstock.stock, "sssssssssssssssss11111111111111")
            if (productstock.stock == 0 && count == 1) {
                console.log("qqqqqqqqqqqqqqqqqqqqqqqqqqq");
                return res.json({ status: false });
            }

            if (count == -1) {
                await Product.updateOne(
                    { _id: product.item },
                    { $inc: { stock: 1 } }
                );
            } else {
                await Product.updateOne(
                    { _id: product.item },
                    { $inc: { stock: -1 } }
                );
            }

            await Cart.updateOne(
                { _id: req.body.cart, "products._id": unique_id },
                { $inc: { "products.$.quantity": count } }
            );
            let total = await Cart.aggregate([
                {
                    $match: { user: req.session.userId },
                },
                {
                    $unwind: "$products",
                },
                {
                    $project: {
                        item: { $toObjectId: "$products.item" },
                        size: "$products.size",
                        currentPrice: "$products.currentPrice",
                        tax: "$products.tax",
                        quantity: "$products.quantity",
                    },
                },
                {
                    $lookup: {
                        from: "products",
                        localField: "item",
                        foreignField: "_id",
                        as: "productInfo",
                    },
                },
                {
                    $project: {
                        item: 1,
                        size: 1,
                        currentPrice: 1,
                        tax: 1,
                        quantity: 1,
                        productInfo: { $arrayElemAt: ["$productInfo", 0] },
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalTax: { $sum: { $multiply: ["$quantity", "$tax"] } },
                        total: { $sum: { $multiply: ["$quantity", "$currentPrice"] } },
                        totalWithTax: {
                            $sum: {
                                $multiply: ["$quantity", { $add: ["$tax", "$currentPrice"] }],
                            },
                        },
                    },
                },
            ]);
            console.log(total, "////////");
            res.json({ success: true, total });
            console.log("else worked");
        }
    } catch (error) {
        console.error(error);
    }
};


exports.applyCoupon = async (req, res) => {
    console.log(req.body, "...coupon id ");
    cartTotal = parseInt(req.body.total.replace(/\D/g, ""));
    const userId = req.session.userid;
    let matchCouponId = await Coupon.findOne({
        couponCode: req.body.couponId,
        statusEnable: true, // check if the coupon is enabled
        expires: { $gt: Date.now() }, // check if the current date is before the expiry date
    });

    console.log(cartTotal, "totalparseInt");
    console.log(matchCouponId, "original");
    if (!matchCouponId) {
        return await res.json({ message: "Invalid coupon code", success: false });
    } else if (cartTotal < matchCouponId.minPurchase) {
        return await res.json({
            message: `Coupon requires minimum purchase of Rs . ${matchCouponId.minPurchase}`, success: false
        });
    } else {

        const user = await User.findById(userId).populate("couponsUsed");
        const couponUsed = user.couponsUsed.find((c) => c.couponCode === req.body.couponId);

        if (couponUsed) {
            return await res.json({ message: "Coupon code already used", success: false });
        }
        let discountPercentage = (matchCouponId.discount / cartTotal) * 100;
        let discountAmount = matchCouponId.discount;
        console.log(discountPercentage);
        console.log(discountAmount);
        req.session.discountAmount = discountAmount;
        console.log(req.session.discountAmount, 'aassaasasasaaaaaaaaaaaaaddddddddddddddddddddddddddddddddddddddddddd')
        res.json({
            message: `Coupon applied! You received a discount of Rs. ${discountAmount} (${discountPercentage}% of the total ${cartTotal})`,
            success: true,
            discountAmount,
            discountPercentage,
            cartTotal,
        });

        user.couponsUsed.push(matchCouponId._id);
        await user.save();
    }
};

exports.getcartaddress = async (req, res) => {
    const cartCount = req.cartCount;
    let user = req.session.user;
    let userId = req.session.userid;
    userId = userId.toString();

    try {
        const addressData = await Address.find({ user: userId });
        const currentDate = new Date();
        const couponsData = await Coupon.find({
            statusEnable: true,
            expires: { $gt: currentDate }
        });
        let coupons = null;
        if (couponsData && couponsData.length > 0) {
            coupons = couponsData;
        }
        let address = null;
        if (addressData && addressData.length > 0) {
            address = addressData[0].address;
        }
        cartItems = await Cart.aggregate([
            {
                $match: { userId },
            },
            {
                $unwind: "$products",
            },
            {
                $project: {
                    item: { $toObjectId: "$products.item" },
                    quantity: "$products.quantity",
                    size: '$products.size',
                    currentPrice: '$products.currentPrice',
                    tax: '$products.tax',
                    unique_id: '$products._id'
                },
            },
            {
                $lookup: {
                    from: "products",
                    localField: "item",
                    foreignField: "_id",
                    as: "productInfo",
                },
            },
            {
                $project: {
                    unique_id: 1,
                    item: 1,
                    quantity: 1,
                    size: 1,
                    currentPrice: 1,
                    tax: 1,
                    productInfo: { $arrayElemAt: ["$productInfo", 0] },
                },
            },
        ]);
        console.log(cartItems, "cartItemssss");
        if (cartItems && cartItems.length > 0) {
            cartItems = cartItems;
        } else {
            console.log('dddd')
            cartItems = null
        }

        let total = await Cart.aggregate([
            {
                $match: { user: req.session.userId }
            },
            {
                $unwind: '$products'
            },
            {
                $project: {
                    item: { $toObjectId: '$products.item' },
                    size: '$products.size',
                    currentPrice: '$products.currentPrice',
                    tax: '$products.tax',
                    quantity: '$products.quantity'
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'item',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            {
                $project: {

                    item: 1,
                    size: 1,
                    currentPrice: 1,
                    tax: 1,
                    quantity: 1,
                    productInfo: { $arrayElemAt: ['$productInfo', 0] }
                }
            },
            {
                $group: {
                    _id: null,

                    totalTax: { $sum: { $multiply: ['$quantity', '$tax'] } },
                    total: { $sum: { $multiply: ['$quantity', '$currentPrice'] } },
                    totalWithTax: { $sum: { $multiply: ['$quantity', { $add: ['$tax', '$currentPrice'] }] } }

                }
            }
        ]);

        res.render("user/address", {
            cartCount,
            user,
            total,
            address,
            coupons,
            cartItems
        });
    } catch (error) {
        console.log(error);
    }
};


exports.deliveryAddressPost = async (req, res) => {
    let orders = req.body;
    console.log(orders);
    let cod = req.body["payment-method"];
    console.log(cod);

    let addressId = new mongoose.Types.ObjectId(req.body.address);

    console.log(addressId);

    try {
        const addressDetails = await Address.findOne(
            { "address._id": addressId },
            { "address.$": 1 }
        );
        console.log(addressDetails);

        let filteredAddress = addressDetails.address[0];
        console.log(filteredAddress);
        console.log(filteredAddress.name);

        let cart = await Cart.findOne({ userId: req.session.userid });
        let userId = req.session.userid;
        console.log(cart, userId);

        let total = await Cart.aggregate([
            {
                $match: { user: req.session.userId },
            },
            {
                $unwind: "$products",
            },
            {
                $project: {
                    item: { $toObjectId: "$products.item" },
                    size: "$products.size",
                    currentPrice: "$products.currentPrice",
                    tax: "$products.tax",
                    quantity: "$products.quantity",
                },
            },
            {
                $lookup: {
                    from: "products",
                    localField: "item",
                    foreignField: "_id",
                    as: "productInfo",
                },
            },
            {
                $project: {
                    item: 1,
                    size: 1,
                    currentPrice: 1,
                    tax: 1,
                    quantity: 1,
                    productInfo: { $arrayElemAt: ["$productInfo", 0] },
                },
            },
            {
                $group: {
                    _id: null,
                    totalTax: { $sum: { $multiply: ["$quantity", "$tax"] } },
                    total: { $sum: { $multiply: ["$quantity", "$currentPrice"] } },
                    totalWithTax: {
                        $sum: {
                            $multiply: ["$quantity", { $add: ["$tax", "$currentPrice"] }],
                        },
                    },
                },
            },
        ]);

        console.log(cart.products, "nnnnnnnnnnnnnnnnnn");
        // Store the total value in a session variable
        // req.session.total = total[0].total;

        console.log(total[0].totalWithTax, "cart got");
        let status = req.body["payment-method"] === "COD" ? "placed" : "pending";
        let couponfund = 0;
        if (req.session.discountAmount) {
            couponfund = req.session.discountAmount;
            req.session.discountAmount = 0;
        }
        let orderObj = new Order({
            deliveryDetails: {
                name: filteredAddress.name,
                state: filteredAddress.state,
                streetaddress: filteredAddress.streetaddress,
                appartment: filteredAddress.appartment,
                town: filteredAddress.town,
                zip: filteredAddress.zip,
                mobile: filteredAddress.mobile,
                email: filteredAddress.email,
                radio: filteredAddress.radio,
            },
            userId: cart.userId,
            paymentMethod: req.body["payment-method"],
            products: cart.products,
            coupon: couponfund,
            totalAmount: total[0].totalWithTax,
            paymentstatus: status,
            deliverystatus: "not shipped",
            createdAt: new Date(),
        });
        console.log(orderObj);
        let orderDoc = await Order.create(orderObj);
        console.log(orderDoc, "order createad");
        let orderId = orderDoc._id;
        let orderIdString = orderId.toString();
        console.log(orderIdString, "order string");

        // Find and delete the cart items for the user

        if (req.body["payment-method"] == "COD") {
            await Cart.findOneAndDelete({ userId: cart.userId });
            res.json({ codSuccess: true });
        } else if (req.body["payment-method"] == "RazorPay") {
            console.log(orderDoc._id, "iddd of order");
            var options = {
                amount: (orderDoc.totalAmount - orderDoc.coupon) * 100, // amount in the smallest currency unit
                currency: "INR",
                receipt: orderIdString,
            };
            instance.orders.create(options, function (err, order) {
                console.log(order, "new order");
                res.json(order);
            });
        } else {
            let amt = await Wallet.findOne({ userId: req.session.userid })
            let finalamt = orderDoc.totalAmount - orderDoc.coupon;
            if (finalamt <= amt.balance) {
                await Order.updateOne(
                    { _id: orderId },
                    {
                        $set: {
                            paymentstatus: "placed",
                        },
                    }
                );
                await Cart.findOneAndDelete({ userId: cart.userId });
                res.json({ walletSuccess: true });
            } else {
                res.json({ walletSuccess: false });
            }
        }
    } catch (error) {
        console.log(error);
    }
}


exports.savedAddressget = async (req, res) => {
    let user = req.session.user;
    let userId = req.session.userid;
    userId = userId.toString();
    console.log(userId)
    const cartCount = req.cartCount;
    const addressData = await Address.find({ user: userId });
    let address = null;
    if (addressData && addressData.length > 0) {
        address = addressData[0].address;
        console.log(address);
        try {
            res.render("user/saveaddress", {
                admin: false,
                user,
                cartCount,
                address,
            });
        } catch (error) {
            console.log(error);
        }
    } else {
        console.log("No address data found");
        res.render("user/saveaddress", {
            admin: false,
            user,
            cartCount,
            address,
        });
    }
    // Clear any existing session data for address
    req.session.address = null;
}


exports.savedAddressPost = async (req, res) => {
    console.log(req.session.user, "/////////");
    let cartCount = req.cartCount;
    let user = req.session.userid;
    let addaddress = {
        name: req.body.name,
        state: req.body.state,
        streetaddress: req.body.streetaddress,
        appartment: req.body.appartment,
        town: req.body.town,
        zip: req.body.zip,
        mobile: req.body.mobile,
        email: req.body.email,
        radio: req.body.radio,
    }
    console.log(addaddress)
    try {
        const data = await Address.findOne({ user: user });
        if (data) {
            data.address.push(addaddress);
            const updated_data = await Address.findOneAndUpdate(
                { user: user },
                { $set: { address: data.address } },
                { returnDocument: "after" }
            );
            console.log(updated_data, "updated address collection");
        } else {
            const address = new Address({
                user: req.session.userid,
                address: [addaddress],
            });
            const addressdata = await address.save();
        }
        res.redirect('/user/address')
    } catch (error) {
        console.log(error);
    }
}


exports.editSavedAddress = async (req, res) => {
    try {
        let user = req.session.user;
        const cartCount = req.cartCount;
        console.log(req.params.id); // Check if id is coming in params
        const address = await Address.findOne({ "address._id": req.params.id });
        const selectedAddress = address.address.find(
            (addr) => addr._id.toString() === req.params.id
        );
        console.log(selectedAddress, "selectedAddress");
        res.render("user/edit-SavedAddress", {
            user,
            cartCount,
            address: selectedAddress,
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
}


exports.editSavedAddressPost = async (req, res) => {
    try {
        const userId = req.session.userid;
        const addressId = req.params.id;
        console.log(userId);
        console.log(addressId);
        const user = await Address.findOne({ user: userId });
        const address = user.address.find((a) => a._id.toString() === addressId);
        console.log(address, "address got");
        const updatedAddress = {
            name: req.body.name,
            state: req.body.state,
            streetaddress: req.body.streetaddress,
            appartment: req.body.appartment,
            town: req.body.town,
            zip: req.body.zip,
            mobile: req.body.mobile,
            email: req.body.email,
            radio: req.body.radio,
        };
        const result = await Address.updateOne(
            { user: userId, "address._id": new ObjectId(addressId) },
            { $set: { "address.$": updatedAddress } }
        );

        console.log(result);
        res.redirect('/user/saveAddress');

    } catch (error) {
        console.log(error);
        res.status(500).send("Server Error");
    }
}


exports.deleteAddress = async (req, res) => {
    try {
        const userId = req.session.userid;
        const addressId = req.params.id;
        const result = await Address.updateOne(
            { user: userId },
            { $pull: { address: { _id: new ObjectId(addressId) } } }
        );
        res.json({ status: true });
    } catch (error) {
        console.log(error);
        res.status(500).send("Server Error");
    }
}


exports.removeItem = async (req, res) => {
    try {
        console.log(req.body.product, "iddunique");
        let unique_id = new ObjectId(req.body.product);
        console.log(req.body.product, "iddunique");

        const cart = await Cart.findOne({ _id: req.body.cart });
        const product = cart.products.find((item) => item._id.equals(unique_id));

        await Product.updateOne(
            { _id: product.item },
            { $inc: { stock: product.quantity } }
        );

        await Cart.updateOne(
            {
                _id: req.body.cart,
                "products._id": unique_id,
            },
            {
                $pull: { products: { _id: unique_id } },
            }
        )
        let displayTotal = await Cart.aggregate([
            {
                $match: { user: req.session.userId },
            },
            {
                $unwind: "$products",
            },
            {
                $project: {
                    item: { $toObjectId: "$products.item" },
                    size: "$products.size",
                    currentPrice: "$products.currentPrice",
                    tax: "$products.tax",
                    quantity: "$products.quantity",
                },
            },
            {
                $lookup: {
                    from: "products",
                    localField: "item",
                    foreignField: "_id",
                    as: "productInfo",
                },
            },
            {
                $project: {
                    item: 1,
                    size: 1,
                    currentPrice: 1,
                    tax: 1,
                    quantity: 1,
                    productInfo: { $arrayElemAt: ["$productInfo", 0] },
                },
            },
            {
                $group: {
                    _id: null,

                    totalTax: { $sum: { $multiply: ["$quantity", "$tax"] } },
                    total: { $sum: { $multiply: ["$quantity", "$currentPrice"] } },
                    totalWithTax: {
                        $sum: {
                            $multiply: ["$quantity", { $add: ["$tax", "$currentPrice"] }],
                        },
                    },
                },
            },
        ]);

        let response = {};
        if (displayTotal.length === 0) {

            response.subtotal = 0;
            response.tax = 0;
            response.totalWithTax = 0;
            await res.json(response);
        } else {
            let subtotal = displayTotal[0].total;
            let tax = displayTotal[0].totalTax;
            let totalWithTax = displayTotal[0].totalWithTax;
            // if(req.session.coupon){


            response.subtotal = subtotal;
            response.tax = tax;
            response.totalWithTax = totalWithTax;

            await res.json(response);
        }
    } catch (error) {
        console.log(error);
    }
};


exports.orderPlacedCod = (req, res) => {
    let user = req.session.user;
    const cartCount = req.cartCount;
    try {
        res.render('user/OrderPlacedCod', { other: false, admin: false, user, cartCount });
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
}


exports.orderview = async (req, res) => {
    let orders = await Order.find({ userId: req.session.userid })
        .sort("-updatedAt")
        .populate({
            path: "products.item",
            model: "Product",
        })
        .exec();

    if (orders && orders.length > 0) {
        orders = orders;
    } else {
        orders = null;
    }
    console.log(orders, "ordersssss");

    const cartCount = req.cartCount;
    if (req.session.filterOrders) {
        res.locals.orders = req.session.filterOrders;
        req.session.filterOrders = null;
    } else if (req.session.noOrders) {
        res.locals.orders = req.session.noOrders;
        req.session.noOrders = null;
    } else if (req.session.cancelledOrders) {
        res.locals.orders = req.session.cancelledOrders;
        req.session.cancelledOrders = null;
    } else if (req.session.notShippedOrders) {
        res.locals.orders = req.session.notShippedOrders;
        req.session.notShippedOrders = null;
    } else if (req.session.returneddOrders) {
        res.locals.orders = req.session.returneddOrders;
        req.session.returneddOrders = null;
    } else {
        res.locals.orders = orders;
    }

    res.render("user/order-view", {
        cartCount,
        user: req.session.user,
    });
}



exports.sortOrders = async (req, res) => {
    console.log(req.body, 'afadsf')
    const userId = req.session.userid;
    const selectedYear = req.body.selector;

    const startDate = new Date(selectedYear, 0, 1); // January 1st of selected year
    const endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999); // December 31st of selected year
    console.log(startDate, "\\\\\\\\\\")
    console.log(endDate, "????????????")

    // Find all orders of the user that were created between the start and end dates of the selected year

    const orders = await Order.find({
        userId: userId,
        createdAt: { $gte: startDate, $lte: endDate }
    }).populate({
        path: 'products.item',
        model: 'Product'
    }).exec();
    console.log(orders, 'sorted date');
    if (orders) {
        req.session.filterOrders = orders;
        console.log("got 2023")
    } else {
        req.session.noOrders = 'no item founded'
        console.log("got null")
    }
    res.redirect('/user/order-view');
}


exports.returnOrders = async (req, res) => {
    let productId = req.query.productId;
    let orderId = req.query.orderId;
    let reason = req.query.reason;
    const currentDate = new Date();
    console.log(productId, orderId, 'first pro second order')
    let orders = await Order.find({ _id: orderId })
        .populate({
            path: 'products.item',
            model: 'Product'
        }).exec();
    let product = null;
    for (let i = 0; i < orders.length; i++) {
        let order = orders[i];
        product = order.products.find(product => product.item._id.toString() === productId);
        const returnExpiryDate = new Date(order.createdAt);
        returnExpiryDate.setDate(returnExpiryDate.getDate() + 1);
        if (currentDate > returnExpiryDate) {
            return res.json({ status: false });
        }
        if (product) {
            product.orderstatus = 'returned';
            product.deliverystatus = 'returned';
            product.reason = reason;
            await Product.findByIdAndUpdate(productId, { $inc: { stock: 1 } });
            await order.save();
            break; // Exit the loop once product is found
        }
    }
    console.log(orders, 'total')
    console.log(product, 'igot the product')
    res.json({ status: true })
}


exports.cancelOrders = async (req, res) => {
    let productId = req.query.productId
    let orderId = req.query.orderId;
    let reason = req.query.reason;
    console.log(reason, "asasasasasasaaaaaaaaaaaaaaaaaaaaaaaaa")
    console.log(productId, orderId, 'first pro second order')

    let orders = await Order.find({ _id: orderId })
        .populate({
            path: 'products.item',
            model: 'Product'
        }).exec();

    let product = null;
    for (let i = 0; i < orders.length; i++) {
        let order = orders[i];
        product = order.products.find(product => product.item._id.toString() === productId);
        if (product) {
            product.orderstatus = 'cancelled';
            product.deliverystatus = 'cancelled';
            product.reason = reason;
            await Product.findByIdAndUpdate(productId, { $inc: { stock: 1 } });
            await order.save();
            break; // Exit the loop once product is found
        }
    }
    console.log(orders, 'total')
    console.log(product, 'igot the product')
    res.json({ status: true })
}


exports.listOfNotShippedOrder = async (req, res) => {
    let orders = await Order.find({
        userId: req.session.user.id,
        'products.deliverystatus': 'not-shipped',
        'products.orderstatus': 'processing'
    }).populate({
        path: 'products.item',
        model: 'Product'
    }).exec();

    req.session.notShippedOrders = orders
    res.redirect('/user/order-view')
}


exports.listOfCancelledOrder = async (req, res) => {
    let orders = await Order.find({
        userId: req.session.userid,
        'products.orderstatus': 'cancelled'
    }).populate({
        path: 'products.item',
        model: 'Product'
    }).exec();
    req.session.cancelledOrders = orders;
    res.redirect('/user/order-view');
}

exports.listOfReturnedOrder = async (req, res) => {
    let orders = await Order.find({
        userId: req.session.userid,
        'products.orderstatus': 'returned'
    }).populate({
        path: 'products.item',
        model: 'Product'
    }).exec();
    req.session.returneddOrders = orders
    res.redirect('/user/order-view')
}


exports.invoice = async (req, res) => {

    let productId = req.query.productId;
    let orderId = req.query.orderId;
    const cartCount = req.cartCount;
    console.log(productId, orderId, 'first pro second order')
    let orders = await Order.find({ _id: orderId })
        .populate({
            path: 'products.item',
            model: 'Product'
        }).exec();
    console.log(orders, 'total')
    let product = null;
    for (let i = 0; i < orders.length; i++) {
        let order = orders[i];
        product = order.products.find(product => product.item._id.toString() === productId);
        if (product) {
            // If product found, fetch the details from the Product model
            break; // Exit the loop once product is found
        }
    }
    console.log(product, 'particluar')
    console.log(orders, 'total')
    res.render('user/invoice', { orders, product, user: req.session.user, cartCount, admin: false });
}


exports.paymentVerify = async (req, res) => {
    let userId = req.session.userid;
    let cart = await Cart.findOne({ userId: req.session.userid });
    console.log(req.body, "..success of order");
    try {
        let details = req.body;
        const crypto = require("crypto");
        let hmac = crypto.createHmac("sha256", "4BC2J0kRxsq8gNNCr5shQfSv");
        console.log(hmac, "\\\\\\\\\\")
        hmac.update(
            details.payment.razorpay_order_id +
            "|" +
            details.payment.razorpay_payment_id
        );
        hmac = hmac.digest("hex");
        const razorpayOrderId = req.body.payment.razorpay_order_id;
        const razorpayPaymentId = req.body.payment.razorpay_payment_id;
        const razorpaySignature = req.body.payment.razorpay_signature;
        console.log(req.body.payment.razorpay_order_id);
        console.log(req.body.payment.razorpay_payment_id);
        console.log(req.body.payment.razorpay_signature);

        console.log(req.body.order.receipt);
        let orderResponse = req.body.order.receipt;
        console.log(orderResponse, "????????????");
        let orderObjId = new ObjectId(orderResponse);
        console.log(";;;;;;;;;;;;;;;;;");
        console.log(hmac, "///////////");
        console.log(req.body.payment.razorpay_signature, "");

        if (hmac == details.payment.razorpay_signature) {
            await Order.updateOne(
                { _id: orderObjId },
                {
                    $set: {
                        paymentstatus: "placed",
                    },
                }
            );
            await Cart.findOneAndDelete({ userId: cart.userId });
            console.log("payment is successful");
            res.json({ status: true });
        } else {
            await Order.updateOne(
                { _id: orderObjId },
                {
                    $set: {
                        paymentstatus: "failed",
                    },
                }
            );
            console.log("payment is failed");
            res.json({ status: false, errMsg: "" });
        }
    } catch (error) {
        console.log(error, "error");
    }
};


exports.paymentFailed = (req, res) => {
    let user = req.session.user;
    const cartCount = req.cartCount;
    try {
        res.render('user/payment-failed', { other: false, admin: false, user, cartCount });
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
}


exports.mywallet = async (req, res) => {
    let user = req.session.user;
    let userId = req.session.userid;
    console.log(userId, "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq")
    const cartCount = req.cartCount;
    try {
        let orders = await Order.find({
            userId: userId,
            $or: [
                { "products.orderstatus": "cancelled" },
                { "products.orderstatus": "returned" }
            ]
        });
        console.log(orders);
        let totalAmountSum = 0;
        orders.forEach((order) => {
            order.products.forEach((product) => {
                if (product.orderstatus === "cancelled" || product.orderstatus === "returned") {
                    totalAmountSum += product.tax + product.currentPrice;
                }
            });
        });

        let sums = await Order.find({
            userId: userId,
            paymentstatus: "placed",
            paymentMethod: "Wallet"
        });
        let Amount = 0, balanceamt = 0, finalamount = 0;
        sums.forEach((sum) => {
            Amount += sum.totalAmount;
        }); console.log(Amount)
        balanceamt = totalAmountSum - Amount;
        if (totalAmountSum) {
            const wallet = await Wallet.findOneAndUpdate(
                { userId: req.session.userid },
                { $set: { balance: balanceamt } },
                { new: true }
            );
            finalamount = wallet.balance
        }
        res.render('user/user-wallet', { other: false, admin: false, user, cartCount, finalamount });
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
}


exports.orderinvoice = async (req, res) => {
    let orderId = req.query.orderId;
    const cartCount = req.cartCount;
    console.log(orderId, 'first pro second order')
    let orders = await Order.find({ _id: orderId })
        .populate({
            path: 'products.item',
            model: 'Product'
        }).exec();
    let orderdrop = await Order.find({
        _id: orderId,
        $or: [
            { "products.orderstatus": "cancelled" },
            { "products.orderstatus": "returned" }
        ]
    });
    let totalAmountSumdrop = 0;
    if (orderdrop.length > 0) {
        orderdrop[0].products.forEach((product) => {
            if (product.orderstatus === "cancelled" || product.orderstatus === "returned") {
                totalAmountSumdrop += product.tax + product.currentPrice;
            }
        });
    }
    res.render('user/order-invoice', { orders, user: req.session.user, cartCount, totalAmountSumdrop, admin: false });
}




