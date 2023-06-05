var express = require('express');


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

exports.setNoCache = (req, res, next)=> {
    res.setHeader("Cache-Control", "no-store");
    next();
}


