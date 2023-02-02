const express = require("express");
const router = express.Router();

const contactController = require("../controllers/contact.controller");

router.post("/create", contactController.createContact);

module.exports = router;
