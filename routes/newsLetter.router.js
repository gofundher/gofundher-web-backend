"use strict";

const express = require("express");
const router = express.Router();
const newsLetter=require('../controllers/newsLetterController')

router.post("/add", newsLetter.addNewsLetter);
module.exports = router;