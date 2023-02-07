/** @format */

'use strict';

const { Upload } = require('../models');
const fs = require('fs');
const path = require('path');
const __basedir = path.join(__dirname, '../public');
const Jimp = require('jimp');
var sizeOf = require('image-size');

const resizeImage = async (sourcePath, destinationPath, width) => {
  console.log('resizeImage');
  return new Promise((resolve, reject) => {
    Jimp.read(sourcePath, function(err, lenna) {
      if (err) {
        reject(new Error(err));
      }
      lenna
        .resize(width, Jimp.AUTO)
        .quality(100)
        .write(destinationPath); // save

      resolve(destinationPath);
    });
  });
};

const resizeImageMain = async (sourcePath, sourcePathMain, width, height) => {
  console.log('resizeImageMain');
  return new Promise((resolve, reject) => {
    // var dimensions = sizeOf(sourcePath)
    // console.log(dimensions.width, dimensions.height);

    Jimp.read(sourcePath, function(err, lenna) {
      if (err) {
        reject(new Error(err));
      }
      lenna
        .resize(width, Jimp.AUTO)
        .quality(80)
        .write(sourcePathMain); // save
      resolve(sourcePathMain);
    });
  });
};

const uploadFiles = async (req, res) => {
  try {
    const data = req.file;
    if (!data) {
      return res.status(401).json({
        responseCode: 401,
        message: 'Not provided any file to upload!',
        success: false,
      });
    }
    console.log('before dimensions');
    const imageName = path.join('/images/', data.filename);
    const thumbnailName = path.join('/images-thumbnail/', data.filename);
    const upd = new Upload({
      type: data.mimetype,
      name: data.originalname,
      data: imageName,
      thumbnailImage: thumbnailName,
    });
    const uploadData = await upd.save();
    return res.status(200).json({
      responseCode: 200,
      message: 'File uploaded successfully!',
      data: '/images/' + data.filename,
      fileData: uploadData,
      success: true,
    });
  } catch (error) {
    console.log(error, 'error while saving file');
    return res.status(400).json({
      responseCode: 400,
      message: 'Error while saving file!',
      error: error,
      success: false,
    });
  }
};

const uploadEditorsFile = async (req, res) => {
  try {
    const data = req.files;
    if (!data) {
      return res.status(401).json({
        responseCode: 401,
        message: 'Not provided any file to upload!',
        success: false,
      });
    }
    let temp = [];
    data.forEach(file => {
      temp.push('/images/' + file.filename);
    });
    return res.status(200).json({
      responseCode: 200,
      message: 'File uploaded successfully!',
      data: temp,
      success: true,
    });
  } catch (error) {
    console.log(error, 'error while saving file');
    return res.status(400).json({
      responseCode: 400,
      message: 'Error while saving file!',
      error: error,
      success: false,
    });
  }
};

module.exports = {
  uploadFiles,
  uploadEditorsFile,
};
