const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const flash = require('express-flash');
const adminController = require('../controllers/adminController')
const adminmiddleware = require('../middlewares/adminmiddleware')


const { error, log } = require('console');


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


// Function to upload project images
var upload = multer({ storage: storage }).any('uploadedImages');

/* GET home page. */

function setNoCache(req, res, next) {
  res.setHeader("Cache-Control", "no-store");
  next();
}


//admin  
router.get('/', adminmiddleware.isLogin, adminController.adminindex)
router.get('/admin-index', setNoCache, adminmiddleware.isLogin, adminController.getadminindex);
router.get('/admin-login', adminController.adminlogin)
router.post('/admin-login', adminController.postadminlogin)
router.get('/admin-logout', adminController.adminlogout)


//product controller
router.get('/add-product', setNoCache, adminmiddleware.isLogin, adminController.addproduct);
router.post('/add-product', upload, adminController.postaddproduct);
router.get('/view-product', setNoCache, adminController.viewproducts);
router.get('/edit-product/:id', adminController.editproduct);
router.post('/edit-product/:id', upload, adminController.posteditproduct)
router.get('/delete-product/:id', adminController.deleteproduct);


//user controller
router.get('/view-user', setNoCache, adminController.viewuser);
router.get('/block-user/:id', adminController.blockuser);
router.get('/unblock-user/:id', adminController.unblockuser);


//category controller
router.get('/add-category', adminmiddleware.isLogin, setNoCache, adminController.addcategory);
router.post('/add-category', adminController.postaddcategory);
router.get('/delete-category/:id', adminController.deletecategory);
router.get('/add-subcategory', setNoCache, adminController.addsubcategory);
router.post('/add-subcategory', adminController.postaddsubcategory)
router.get('/delete-subcategory/:id', adminController.deleteaddsubcategory);


//order controller
router.get('/view-order', adminmiddleware.isLogin, setNoCache, adminController.vieworder)
router.post('/order-details', adminController.orderDetails)


//coupon controller
router.get('/coupon', adminmiddleware.isLogin, setNoCache, adminController.coupon)
router.post('/coupon', adminController.postcoupon)
router.patch('/coupon-disable/:id', adminController.disablecoupon);
router.patch('/coupon-enable/:id', adminController.enablecoupon);
router.get('/edit-coupon/:id',adminmiddleware.isLogin, setNoCache, adminController.geteditcoupon)
router.post('/edit-coupon', adminController.posteditcoupon)


//coupon controller
router.get('/view-banner', adminmiddleware.isLogin, setNoCache, adminController.viewBanner)
router.get('/add-banner', adminmiddleware.isLogin, setNoCache, adminController.addbanner)
router.post('/add-banner', upload, adminController.postaddbanner)
router.get('/edit-banner/:id', adminmiddleware.isLogin, setNoCache, adminController.editbanner)
router.post('/edit-banner/:id', upload, adminController.posteditbanner)
router.get('/delete-banner/:id', adminController.deletebanner);


router.get('/view-dashboard', setNoCache, adminmiddleware.isLogin, adminController.getdashboard)
router.get('/view-salesReport', setNoCache, adminmiddleware.isLogin, adminController.getsalesReport)

router.get('/order-productDetails', adminmiddleware.isLogin, setNoCache, adminController.getproductDetails)

module.exports = router;

