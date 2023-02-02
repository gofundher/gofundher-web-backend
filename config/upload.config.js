/** @format */

'use strict';

const multer = require('multer');
const path = require('path');
const __basedir = path.join(__dirname, '../public');

let storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __basedir + '/images/');
  },
  filename: (req, file, cb) => {
    let splittedFileName = file.originalname.split('.');
    const extension = splittedFileName.pop();
    const fileName = splittedFileName
      .join(' ')
      .replace(new RegExp(/[ +!@#$%^&*().]/g), '_');
    cb(
      null,
      file.fieldname + '-' + Date.now() + '-' + fileName + '.' + extension,
    );
  },
});

let upload = multer({ storage: storage });

module.exports = upload;
