var express = require('express');


exports.isLogin = async (req, res, next) => {
    try {
        let admin = req.session.admin;
        if (admin) {
            next();
        } else {
            res.redirect('/admin/admin-login');
        }
    } catch (error) {
        console.log(error.message);
    }
};



