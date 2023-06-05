var express = require('express');
var router = express.Router();
const multer = require('multer');
const path = require('path');
const flash = require('express-flash');
const notifier = require('node-notifier');
const bcrypt = require('bcryptjs');
const jsPDF = require('jspdf');


//usermodel Database   
const User = require('../models/userModel');
const Admin = require('../models/adminSchema');
const Product = require('../models/productModel');
const Category = require('../models/categorySchema');
const SubCategory = require('../models/subCategorySchema');
const Coupon = require('../models/couponSchema');
var voucher_codes = require("voucher-code-generator");
const Order = require("../models/orderSchema");
const Banner = require("../models/bannerSchema");

const { error, log } = require('console');

const credential = {
    email: "admin@gmail.com",
    password: "admin123"
}

//multer
var storage = multer.diskStorage({
    destination: function (request, file, callback) {
        callback(null, 'public/uploads');
    },
    filename: function (request, file, callback) {
        console.log(file);
        callback(null, file.originalname)
    }
});


exports.adminindex = (req, res) => {
    res.redirect('/admin/view-dashboard');
}


exports.adminlogin = (req, res) => {
    if (req.session.admin) {
        res.redirect('/admin/admin-index');
    } else {
        res.render('admin/admin-login', { other: true })
    }
}


exports.postadminlogin = async (req, res) => {
    try {
        console.log(req.body.email, "zzzzzzzzzzzzzzzzzzzz")
        let admin = await Admin.findOne({ email: req.body.email })

        if (!admin) {
            req.flash('error_msg', 'Invalid Credentials');
            return res.redirect('/admin/admin-login');
        }
        let isMatch = await bcrypt.compare(req.body.password, admin.password);
        console.log(isMatch);
        if (!isMatch) {
            req.flash('error_msg', 'Invalid Password');
            return res.redirect('/admin/admin-login');
        }
        req.session.admin = req.body.email;
        req.session.admin.loggedIn = true
        res.redirect('/admin/view-dashboard');
    } catch (err) {
        console.log(err.message);
        res.status(500).send('Server error')
    }
}


exports.getadminindex = (req, res) => {
    console.log(req.session.admin)
    if (req.session.admin) {
        res.redirect('/admin/view-dashboard');
    } else {
        res.render('admin/admin-login', { other: true })
    }
}


exports.addproduct = async (req, res) => {
    if (req.session.admin) {
        const categories = await Category.find();
        const subcategories = await SubCategory.find()
        res.render('admin/add-product', { admin: true, categories, subcategories });
    } else {
        res.render('admin/admin-login', { other: true })
    }
}


exports.postaddproduct = (req, res) => {
    const product = new Product({
        brand: req.body.brand,
        productname: req.body.productname,
        producttype: req.body.producttype,
        category: req.body.category,
        subcategory: req.body.subcategory,
        price: req.body.price,
        discountPerc: req.body.discountPerc,
        size: req.body.size,
        stock: req.body.stock,
        images: req.files.map(file => file.filename),
    });
    product.save()
        .then(() => {
            console.log('Data saved successfully');
            res.redirect('/admin/view-product');
        })
        .catch((err) => {
            console.log(err);
            res.status(500).send(err);
        });
}


exports.viewproducts = (req, res) => {
    if (req.session.admin) {
        Product.find({ deleted: false })
            .then(products => {
                console.log(products);
                res.render('admin/view-product', { admin: true, products: products });
            })
            .catch(err => {
                console.log(err);
                res.status(500).send(err);
            });
    } else {
        res.render('admin/admin-login', { other: true })
    }
}


exports.editproduct = async (req, res) => {
    const id = req.params.id;
    const categories = await Category.find();
    const subcategories = await SubCategory.find()
    Product.findById(id)
        .then(products => {
            console.log(products);
            res.render('admin/edit-product', { admin: true, products: products, categories, subcategories });
        })
        .catch(err => {
            console.log(err);
            res.status(500).send(err);
        });
}


exports.posteditproduct = (req, res) => {
    console.log("bro");
    const id = req.params.id;
    console.log(req.body.category, "laaaaaaaaaaaaaaaaaaa");
    const { brand, productname, producttype, category, subcategory, price, discountPerc, size, stock } = req.body;
    let images = [];

    if (req.files && req.files.length > 0) {
        images = req.files.map(file => file.filename);
    }
    // Find the product by ID and update its properties
    Product.findById(id)
        .then(product => {
            // Construct the updated product object with the new data
            const updatedProduct = {
                brand,
                productname,
                producttype,
                category,
                subcategory,
                price,
                discountPerc,
                size,
                stock,
                images: images.length > 0 ? [...product.images, ...images] : product.images
            };
            // Update the product in the database
            return Product.findByIdAndUpdate(id, updatedProduct, { new: true });
        })
        .then(updatedProduct => {
            console.log(updatedProduct, "qwwwwwwwwwwwwwwwwwwwwww");
            res.redirect('/admin/view-product');
        })
        .catch(err => {
            console.log(err);
            res.status(500).send(err);
        });
}

exports.deleteproduct = async (req, res) => {
    const id = req.params.id;
    console.log(id);
    try {
        const product = await Product.findByIdAndUpdate(
            id,
            { deleted: true },
            { new: true }
        );
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ status: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


exports.viewuser = async (req, res) => {
    if (req.session.admin) {
        await User.find().then((users) => {
            console.log(users);
            res.render('admin/view-user', { admin: true, users });
        })
    } else {
        res.render('admin/admin-login', { other: true })
    }
}


exports.blockuser = async (req, res) => {
    try {
        const id = req.params.id;
        console.log("blockedddddddd");
        await User.findByIdAndUpdate(id, { blockStatus: true });
        res.json({ sucesss: true });
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
}


exports.unblockuser = (req, res) => {
    const id = req.params.id;
    console.log("unblocked");
    User.findByIdAndUpdate(id, { blockStatus: false })
        .then(() => {
            res.json({ sucesss: true });
        })
        .catch(err => {
            console.log(err);
            res.status(500).send(err);
        });
}


exports.addcategory = async (req, res) => {
    if (req.session.admin) {
        const categorydata = await Category.find();
        res.render("admin/add-category", { category: categorydata, admin: true });
    } else {
        res.redirect("/admin/admin-login");
    }
}


exports.postaddcategory = async (req, res) => {
    try {
        console.log(req.body.category)
        const category_data = await Category.find();
        if (category_data.length > 0) {
            let checking = false;
            for (let i = 0; i < category_data.length; i++) {
                if (category_data[i]["category"].toLowerCase() === req.body.category.toLowerCase()) {
                    checking = true;
                    break;
                }
            }
            if (checking == false) {
                let category = new Category({
                    category: req.body.category
                });
                const cart_data = await category.save();
                res.json({ status: true })
                console.log("new category added");
            } else {
                console.log("category already exist");
                res.json({ status: false })
            }
        } else {
            const category = new Category({
                category: req.body.category
            });
            await category.save();
            res.json({ status: true })
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}


exports.deletecategory = async (req, res) => {
    const id = req.params.id;
    console.log(id);
    await Category.deleteOne({ _id: id }).then(() => {
        res.json({ status: true });
    })
}


exports.addsubcategory = async (req, res) => {
    if (req.session.admin) {
        try {
            const categories = await Category.find();
            const subcategories = await SubCategory.find()
            console.log(subcategories)
            res.render('admin/add-subcategory', { admin: true, categories, subcategories })
        } catch (error) {
            console.log(error)
        }
    } else {
        res.redirect("/admin/admin-login");
    }

}


exports.postaddsubcategory = async (req, res) => {
    try {
        console.log(req.body.category)
        const check_sub = await SubCategory.find({ category_id: req.body.category })
        if (check_sub.length > 0) {
            let checking = false
            for (let i = 0; i < check_sub.length; i++) {
                if (check_sub[i]['subcategory'].toLowerCase() === req.body.subcategory.toLowerCase()) {
                    checking = true;
                    break;
                }
            }
            if (checking === false) {
                const subCategory = new SubCategory({
                    subcategory: req.body.subcategory,
                    category_id: req.body.category

                })
                await subCategory.save()
                res.redirect('add-subcategory')

            } else {
                res.redirect('add-subcategory')
            }
        } else {
            const subCategory = new SubCategory({
                subcategory: req.body.subcategory,
                category_id: req.body.category
            })
            const sub_cat_data = await subCategory.save()
            console.log(sub_cat_data)
        }
    } catch (error) {
        res.status(400).send({ success: false, msg: error.message })
    }
}


exports.deleteaddsubcategory = async (req, res) => {
    console.log("haiiiii");
    const id = req.params.id;
    console.log(id);
    await SubCategory.deleteOne({ _id: id }).then(() => {
        res.json({ status: true });
    })
}


exports.adminlogout = (req, res) => {
    req.session.admin = null;
    req.session.adminloggedIn = false;
    res.redirect('/admin/admin-login')
}

exports.vieworder = async (req, res) => {
    let userId = req.session.userid;
    try {
        let orders = await Order.find()
            .populate({
                path: 'userId',
                model: 'User',
                select: 'name email' // select the fields you want to include from the User document
            })
            .populate({
                path: 'products.item',
                model: 'Product'
            })
            .exec();
        res.locals.orders = orders;
        console.log(orders, "all orders");
        res.render("admin/view-order", { admin: true });
    } catch (error) {
        console.log(error);
    }
}


exports.orderDetails = async (req, res) => {
    console.log(req.body, 'selected ')
    let productId = req.query.productId;
    let orderId = req.query.orderId;
    console.log(productId, "proId")
    console.log(orderId, "ordId")
    const deliveryStatus = req.body.deliveryStatus;
    console.log(deliveryStatus)
    if (deliveryStatus == "cancelled") {
        await Product.findByIdAndUpdate(productId, { $inc: { stock: 1 } });
    }
    
    let orders = await Order.find({ _id: orderId })
        .populate({
            path: 'products.item',
            model: 'Product'
        }).exec();

    console.log(orders, "ord")
    let product = null;
    for (let i = 0; i < orders.length; i++) {
        let order = orders[i];
        product = order.products.find(product => product.item._id.toString() === productId);
        console.log(product, "products found")
        if (product) {
            if (deliveryStatus == 'cancelled') {
                product.orderstatus = deliveryStatus;
                product.deliverystatus = deliveryStatus;
            } else {
                product.orderstatus = 'confirmed';
                product.deliverystatus = deliveryStatus;
            }
            await order.save();
            break; // Exit the loop once product is found
        }
    }
    res.redirect('/admin/view-order')
}


exports.coupon = async (req, res) => {
    let coupon = await Coupon.find();
    res.locals.coupon = coupon;
    res.render("admin/coupon", { admin: true });
}


exports.postcoupon = async (req, res) => {
    console.log(req.body, "...body");
    const voucher = voucher_codes.generate({
        prefix: "CODE-",
        length: 7,
        charset: voucher_codes.charset("alphabetic"),
        postfix: "-OFF",
    });
    let strCoupon = voucher.toString();
    console.log(strCoupon);
    const newCoupon = new Coupon({
        couponCode: strCoupon,
        discount: req.body.discount,
        minPurchase: req.body.minPurchase,
        expires: req.body.expires,
        statusEnable: true,
    });
    notifier.notify({
        title: 'Coupon',
        message: 'Coupon Generated successfully!',
    });
    await Coupon.create(newCoupon);
    res.redirect("/admin/coupon");
}


exports.disablecoupon = async (req, res) => {
    try {
        await Coupon.findByIdAndUpdate(
            { _id: req.params.id },
            { statusEnable: false });
        await res.json(true);
    } catch (error) {
        console.log(error);
    }
}


exports.enablecoupon = async (req, res) => {
    try {
        await Coupon.findByIdAndUpdate(
            { _id: req.params.id },
            { statusEnable: true });
        await res.json(true);
    } catch (error) {
        console.log(error);
    }
}

exports.geteditcoupon = async (req, res) => {
    try {
        let couponId = req.params.id;
        let couponDetails = await Coupon.findOne({ _id: couponId });
        res.render('admin/edit-coupon', { admin: true, couponDetails });
    } catch (error) {
        console.log(error);
    }
}


exports.posteditcoupon = async (req, res) => {
    try {
        console.log(req.body);

        let updatedCoupn = await Coupon.findByIdAndUpdate(
            { _id: req.body.couponId },
            {
                couponCode: req.body.couponCode,
                discount: req.body.discount,
                minPurchase: req.body.minPurchase,
                expires: req.body.expires,

            },
            { new: true }
        );
        console.log(updatedCoupn, "updatedcoupon");
        notifier.notify({
            title: 'Coupon Update',
            message: 'Coupon updated successfully!',
        });
        res.redirect("/admin/coupon");
    } catch (error) {
        console.log(error);
    }
}

exports.addbanner = (req, res) => {
    if (req.session.admin) {
        res.render('admin/add-banner', { admin: true });
    } else {
        res.render('admin/admin-login', { other: true })
    }
}

exports.postaddbanner = async (req, res) => {
    const banner = new Banner({
        title: req.body.title,
        description: req.body.description,
        images: req.files.map(file => file.filename),
    });
    banner.save()
        .then(() => {
            console.log('Data saved successfully');
            res.redirect('/admin/view-banner');
        })
        .catch((err) => {
            console.log(err);
            res.status(500).send(err);
        });
}


exports.viewBanner = (req, res) => {
    if (req.session.admin) {
        Banner.find({ deleted: false })
            .then(banners => {

                res.render('admin/view-banner', { admin: true, banners: banners });
            })
            .catch(err => {
                console.log(err);
                res.status(500).send(err);
            });
    } else {
        res.render('admin/admin-login', { other: true })
    }
}


exports.editbanner = async (req, res) => {
    const id = req.params.id;
    Banner.findById(id)
        .then(banners => {

            res.render('admin/edit-banner', { admin: true, banners: banners });
        })
        .catch(err => {
            console.log(err);
            res.status(500).send(err);
        });
}



exports.posteditbanner = (req, res) => {

    const id = req.params.id;
    const { title, description } = req.body;
    let images = [];

    if (req.files && req.files.length > 0) {
        images = req.files.map(file => file.filename);
    }

    // Find the product by ID and update its properties
    Banner.findById(id)
        .then(banner => {
            // Construct the updated product object with the new data
            const updatedBanner = {
                title,
                description,
                images: images.length > 0 ? images : Banner.images
            };
            // Update the product in the database
            return Banner.findByIdAndUpdate(id, updatedBanner, { new: true });
        })
        .then(updatedBanner => {
            console.log(updatedBanner, "qwwwwwwwwwwwwwwwwwwwwww");
            res.redirect('/admin/view-banner');
        })
        .catch(err => {
            console.log(err);
            res.status(500).send(err);
        });
}


exports.deletebanner = async (req, res) => {
    const id = req.params.id;
    console.log(id);
    try {
        const banner = await Banner.findByIdAndUpdate(
            id,
            { deleted: true },
            { new: true }
        );
        if (!banner) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ status: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


exports.getdashboard = async (req, res) => {

    const orders = await Order.find({})
        .populate({
            path: 'products.item',
            model: 'Product'
        }).exec();

    const totalQuantity = orders.reduce((accumulator, order) => {
        order.products.forEach((product) => {
            accumulator += product.quantity;
        });
        return accumulator;
    }, 0);

    const totalProfit = orders.reduce((acc, order) => {
        return acc + order.totalAmount;
    }, 0);

    const totalShipped = orders.reduce((accumulator, order) => {
        order.products.forEach((product) => {
            if (product.deliverystatus === "shipped" || product.deliverystatus === "outofdelivery") {
                accumulator += 1;
            }
        });
        return accumulator;
    }, 0);

    const totalCancelled = orders.reduce((accumulator, order) => {
        order.products.forEach((product) => {
            if (product.orderstatus === "cancelled") {
                accumulator += 1;
            }
        });
        return accumulator;
    }, 0);


    const totalreturned = orders.reduce((accumulator, order) => {
        order.products.forEach((product) => {
            if (product.orderstatus === "returned") {
                accumulator += 1;
            }
        });
        return accumulator;
    }, 0);

    const totaldelivered = orders.reduce((accumulator, order) => {
        order.products.forEach((product) => {
            if (product.deliverystatus === "delivered") {
                accumulator += 1;
            }
        });
        return accumulator;
    }, 0);

    const totalplaced = orders.reduce((accumulator, order) => {
        order.products.forEach((product) => {
            if (product.deliverystatus === "shipped" || product.deliverystatus === "outofdelivery" || product.deliverystatus === "not-shipped") {
                accumulator += 1;
            }
        });
        return accumulator;
    }, 0);

    const startOfYear = new Date(new Date().getFullYear(), 0, 1); // start of the year
    const endOfYear = new Date(new Date().getFullYear(), 11, 31); // end of the year

    let orderBasedOnMonths = await Order.aggregate([
        // match orders within the current year
        { $match: { createdAt: { $gte: startOfYear, $lte: endOfYear } } },

        // group orders by month
        {
            $group: {
                _id: { $month: "$createdAt" },
                orders: { $push: "$$ROOT" }
            }
        },

        // project the month and orders fields
        {
            $project: {
                _id: 0,
                month: "$_id",
                orders: 1
            }
        },
        {
            $project: {
                month: 1,
                orderCount: { $size: "$orders" }
            }
        }
        , {
            $sort: { month: 1 }
        }
    ]);

    console.log(orderBasedOnMonths, 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
    console.log(totalreturned, 'totalreturned')
    console.log(totaldelivered, 'totaldelivered')
    console.log(totalplaced, 'totalplaced')
    console.log(totalCancelled, 'totalCancelled')
    res.render('admin/view-dashboard', { admin: true, totalQuantity, totalProfit, totalShipped, totalCancelled, orderBasedOnMonths, totalreturned, totaldelivered, totalplaced })
}


exports.getsalesReport = async (req, res) => {
    let orders = await Order.find()
        .populate({
            path: 'userId',
            model: 'User',
            select: 'name email' // select the fields you want to include from the User document
        })
        .populate({
            path: 'products.item',
            model: 'Product'
        })
        .exec();
    if (req.session.admin.orderThisWeek) {
        res.locals.orders = req.session.admin.orderThisWeek;
        req.session.admin.orderThisWeek = null;
    } else if (req.session.admin.orderThisMonth) {
        res.locals.orders = req.session.admin.orderThisMonth;
        req.session.admin.orderThisMonth = null;
    } else if (req.session.admin.orderThisDay) {
        res.locals.orders = req.session.admin.orderThisDay;
        req.session.admin.orderThisDay = null;
    } else if (req.session.admin.orderThisYear) {
        res.locals.orders = req.session.admin.orderThisYear;
        req.session.admin.orderThisYear = null;
    } else {
        res.locals.orders = orders;
    }
    console.log(orders, 'sales report order summary')
    res.render('admin/view-salesReport', { admin: true })
}


exports.getproductDetails = async (req, res) => {

    let orderId = req.query.orderId;
    let productId = req.query.productId;
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
            break;
        }
    }

    res.render('admin/order-productDetails', { orders, product, admin: true });
}


