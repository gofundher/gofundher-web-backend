'use strict';

const express = require('express');
const router = express.Router();
const uploadConfig = require('../config/upload.config');
const uploadController = require('../controllers/upload.controller');

router.post(
  '/upload',
  uploadConfig.single('file'),
  uploadController.uploadFiles,
);

router.post(
  '/editors-file-upload',
  uploadConfig.any([{ name: 'files[]' }]),
  uploadController.uploadEditorsFile,
);

module.exports = router;
