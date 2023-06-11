const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const flash = require('express-flash');
const bcrypt = require('bcryptjs');
const ObjectId = mongoose.Types.ObjectId;
const userController = require('../controllers/userControllers');
const usermiddleware = require('../middlewares/usermiddleware')


//GET HOME PAGE
router.get('/', userController.cartCount, userController.userindex);
router.get('/user-index', usermiddleware.setNoCache, usermiddleware.isLogin, userController.cartCount, userController.getuserindex);
router.get('/mens', userController.cartCount, usermiddleware.setNoCache, userController.mens)
router.get('/kids', userController.cartCount, usermiddleware.setNoCache, userController.kids)
router.get('/womens', userController.cartCount, usermiddleware.setNoCache, userController.womens)


//user controller
router.get('/user-login', usermiddleware.setNoCache, userController.userlogin);
router.post('/user-login', userController.postuserlogin);
router.get('/user-signup', usermiddleware.setNoCache, userController.usersignup);
router.post('/user-signup', userController.postusersignup);
router.get('/user-logout', userController.userlogout)


//otp controller
router.get('/user-otp', userController.userotp)
router.post('/user-otp', userController.postuserotp)
router.get('/user-loginootpverify', userController.loginootpverify)
router.post('/user-loginootpverify', userController.postloginootpverify)
router.get('/user-otpverify', userController.userotpverify)
router.post('/user-otpverify', userController.postuserotpverify)
router.get('/user-resendotp', userController.resendotp)
router.get('/user-signupresendotp', userController.signupresendotp)


//userDetails Controller
router.get('/user-profile', usermiddleware.setNoCache, usermiddleware.isLogin, userController.userprofile)
router.post('/user-profile', userController.postuserprofile);
router.post('/user-passwordprofile', usermiddleware.isLogin, userController.passwordprofile);
router.get('/user-homeaddress', usermiddleware.setNoCache, usermiddleware.isLogin, userController.homeaddress)
router.post('/user-homeaddress', userController.posthomeaddress)
router.get('/user-edithomeaddress/:id', usermiddleware.setNoCache, usermiddleware.isLogin, userController.edithomeaddress)
router.post('/user-edithomeaddress/:id', userController.postedithomeaddress)


//cart controller
router.get('/userSingleProduct/:id', usermiddleware.setNoCache, usermiddleware.isLogin, userController.cartCount, userController.getsingleproduct);
router.get('/addtoCart/:id', usermiddleware.isLogin, usermiddleware.setNoCache, userController.cartCount, userController.addtocart);
router.get('/cart', usermiddleware.isLogin, usermiddleware.setNoCache, userController.cartCount, userController.getcartproduct)
router.post('/changeProductQuantity', userController.changeProductQuantity)
router.post('/removeItem', userController.removeItem)


//coupon controller
router.post('/apply-coupon', userController.applyCoupon)


//cartaddress controller
router.get('/address', usermiddleware.setNoCache, usermiddleware.isLogin, userController.cartCount, userController.getcartaddress)
router.post('/address', userController.deliveryAddressPost)
router.get('/saveaddress', usermiddleware.setNoCache, userController.cartCount, usermiddleware.isLogin, userController.savedAddressget)
router.post('/saveaddress', usermiddleware.isLogin, userController.cartCount, userController.savedAddressPost)
router.get('/edit-SavedAddress/:id', usermiddleware.setNoCache, usermiddleware.isLogin, userController.isLogin, userController.cartCount, userController.editSavedAddress)
router.post('/edit-SavedAddress/:id', userController.editSavedAddressPost)
router.delete('/delete-Address/:id', userController.deleteAddress)


//order controller
router.get('/order-placed', usermiddleware.setNoCache, usermiddleware.isLogin, userController.cartCount, userController.orderPlacedCod)
router.get('/order-view', usermiddleware.setNoCache, usermiddleware.isLogin, userController.cartCount, userController.orderview)
router.post('/order-date', userController.sortOrders)
router.get('/return-order', usermiddleware.setNoCache, usermiddleware.isLogin, userController.returnOrders)
router.get('/cancel-order', usermiddleware.setNoCache, usermiddleware.isLogin, userController.cancelOrders)
router.get('/order-not-shipped', usermiddleware.setNoCache, usermiddleware.isLogin, userController.listOfNotShippedOrder)
router.get('/order-cancelled-list', usermiddleware.setNoCache, usermiddleware.isLogin, userController.listOfCancelledOrder)
router.get('/order-returned-list', usermiddleware.setNoCache, usermiddleware.isLogin, userController.listOfReturnedOrder)
router.get('/invoice', usermiddleware.setNoCache, usermiddleware.isLogin, userController.cartCount, userController.invoice)


//payment controller
router.post('/verify-payment', userController.paymentVerify)
router.get('/payment-failed', userController.cartCount, userController.paymentFailed)
router.get('/user-wallet', usermiddleware.setNoCache, usermiddleware.isLogin, userController.mywallet)

//order report
router.get('/order-invoice', usermiddleware.setNoCache, usermiddleware.isLogin, userController.cartCount, userController.orderinvoice)
module.exports = router;

