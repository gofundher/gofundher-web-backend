const express = require("express");
const router = express.Router();
const passport = require("passport");

const authController = require("../controllers/auth.controller");

router.get("/facebook", authController.facebookAuth);

router.get("/facebook/callback",
passport.initialize(),
passport.authenticate("facebook", { failureRedirect: `/login` }),
authController.facebookCallback);

module.exports = router;
