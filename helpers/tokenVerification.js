"use strict";

const { secret } = require("../constants");
const jwt = require("jsonwebtoken");
 const { User} = require("../models");

// JWT Authentication
const userAuthentication = async (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) {
    return res.status(401).json({
      responseCode: 401,
      message: "Unauthorized! Please provide valid authorization token",
      success: false // token not found
    });
  } else {
    try {
      const tokenData = jwt.verify(token, secret);

      const result = await User.findOne({
          where: {
            id: tokenData.id 
          }
        });
        console.log('result.isActive',result.isActive)
      if(result) {
        if(result.isActive === 1 || result.isActive === true){
        req.currentUser = tokenData;
        next();
        }
        else if(result.isActive === 0 || result.isActive === false) {
          return res.status(401).json({
            responseCode: 401,
            message: "Your account has been suspended by Admin!",
            success: false
          });
      }
    }
    } catch (error) {
      return res.status(401).json({
        responseCode: 401,
        message: "Provided authorization token has expired!", //expire token
        success: false
      });
    }
  }
};

// JWT Authentication
const adminAuthentication = async (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) {
    return res.status(401).json({
      responseCode: 401,
      message: "Unauthorized! Please provide valid authorization token",
      success: false // token not found
    });
  } else {
    try {
      const tokenData = jwt.verify(token, secret);
        req.currentUser = tokenData;
        next()
    } catch (error) {
      return res.status(401).json({
        responseCode: 401,
        message: "Provided authorization token has expired!", //expire token
        success: false
      });
    }
  }
};

//JWT Authentication
const authorize = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) {
    req.currentUser = {};
    next();
  } else {
    try {
      const tokenData = jwt.verify(token, secret);
      req.currentUser = tokenData;
      next();
    } catch (error) {
      req.currentUser = {};
      return res.status(401).json({
        responseCode: 401,
        message: "Provided authorization token has expired!", //expire token
        success: false
      });
    }
  }
};

module.exports = {
  userAuthentication,
  authorize,
  adminAuthentication
};
