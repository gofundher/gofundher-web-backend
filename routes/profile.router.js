'use strict';

const express = require('express');
const router = express.Router();
const authentication = require('../helpers/tokenVerification');
const profileController = require('../controllers/profile.controller');

// get user info from database
router.get(
  '/get-userinfo',
  authentication.userAuthentication,
  profileController.showUserData,
);

// update user profile on database
router.post(
  '/update-userinfo',
  authentication.userAuthentication,
  profileController.updateProfile,
);
// update user profile rewards on database
router.post(
  '/update-rewards',
  authentication.userAuthentication,
  profileController.updateRewards,
);

// TO get other user info
router.get(
  '/get-user-profile',
  // authentication.userAuthentication,
  profileController.showuserprofile,
);

// To get all the users profiles
router.get('/get-profile-list', profileController.getProfiles);

// get user sponsor pages links and profile link
router.get('/all-pages-links',  authentication.userAuthentication, profileController.getAllPagesLinks);

// Update user profile link
router.put('/update-profile-link',  authentication.userAuthentication, profileController.postUpdateProfileLinkUrl)

module.exports = router;
