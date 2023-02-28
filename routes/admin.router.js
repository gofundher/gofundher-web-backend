/** @format */

'use strict';

const express = require('express');
const router = express.Router();
const authentication = require('../helpers/tokenVerification');
const adminController = require('../controllers/adminController/auth.controller');
const {
  getDonations,
  getMonthlyDonations,
  updatePayoutStatus,
  exportReport,
} = require('../controllers/adminController/donation.controller');
const { getContactusList, changeStatus } = require('../controllers/adminController/contactus.Controller')
router.post('/login', adminController.adminLogin);
router.get('/view', authentication.adminAuthentication, adminController.view);
router.get(
  '/getprojects',
  // authentication.adminAuthentication,
  adminController.getProjects,
);
router.post(
  '/deleteProject',
  // authentication.adminAuthentication,
  adminController.deleteProject,
);
router.post('/updateFeaturedProjects', adminController.updateFeaturedProjects);
router.post('/updateFeaturedUsers', adminController.updateFeaturedUser);
router.post('/changestatus', adminController.changeProjectStatus);
router.get(
  '/getusers',
  authentication.adminAuthentication,
  adminController.getUsers,
);

router.get(
  '/get-user-profile',
  authentication.adminAuthentication,
  adminController.getUserProfile,
);

router.post(
  '/deleteUser',
  // authentication.adminAuthentication,
  adminController.deleteUser,
);
router.post(
  '/changeSelectedUserStatus',
  authentication.adminAuthentication,
  adminController.changeSelectedUserStatus,
);

router.get(
  '/validate',
  authentication.adminAuthentication,
  adminController.validate,
);

router.get(
  '/getDashboard',
  authentication.adminAuthentication,
  adminController.getDashboard,
);
router.post(
  '/updatePassword',
  authentication.adminAuthentication,
  adminController.updatePassword,
);

router.get(
  '/getComments',
  authentication.adminAuthentication,
  adminController.getComments,
);

router.post(
  '/changeSelectedCommentStatus',
  authentication.adminAuthentication,
  adminController.changeSelectedCommentStatus,
);

router.get(
  '/donations',
  authentication.adminAuthentication,
  getDonations,
);

router.post(
  '/donation/update-status',
  authentication.adminAuthentication,
  updatePayoutStatus,
);

router.get(
  '/monthly-donations',
  authentication.adminAuthentication,
  getMonthlyDonations,
);

router.get(
  '/donation/export',
  authentication.adminAuthentication,
  exportReport,
);

router.get('/contact-query', authentication.adminAuthentication, getContactusList)

router.post('/change-status', authentication.adminAuthentication, changeStatus)
module.exports = router;
