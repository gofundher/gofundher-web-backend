/** @format */

'use strict';

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const validation = require('../helpers/validation');
const authentication = require('../helpers/tokenVerification');

// save user to database
router.post('/signup', validation.signupValidation, userController.userSignup);

// login user into project
router.post('/login', validation.loginValidation, userController.userSignin);
router.post('/social_login', userController.socialLogin);

router.post('/stripeLiveWebhook', userController.stripeLiveWebhook);

// forgot password api
router.post(
  '/forgot-password',
  validation.forgotPasswordValidation,
  userController.userForgotPassword,
);

// verify user api
router.post('/verifing-link', userController.userVerification);

// reset password api
router.post(
  '/reset-password',
  validation.resetPasswordValidation,
  userController.userResetPassword,
);

//get donation data by userid
router.get(
  '/donation-data',
  authentication.userAuthentication,
  userController.getDonationOfUser,
);
//sent donation transactions monthly
router.get(
  '/sent-donation-data-monthly',
  authentication.userAuthentication,
  userController.sentDonationTransactionsMonthly,
);

//sent donation transactions oneTime
router.get(
  '/sent-donation-data-onetime',
  authentication.userAuthentication,
  userController.sentDonationTransactionsOneTime,
);
//sent project donation transaction
router.get(
  '/sent-project-donation-data',
  authentication.userAuthentication,
  userController.sentProjectDonationTransactions,
);
//sent profile donation transaction
router.get(
  '/sent-profile-donation-data',
  authentication.userAuthentication,
  userController.sentProfileDonationTransactions,
);
//receive donation transactions
router.get(
  '/receive-donation-data-onetime',
  authentication.userAuthentication,
  userController.receiveDonationTransactionsOneTime,
);
//receive project donation transactions
router.get(
  '/receive-project-donation-data',
  authentication.userAuthentication,
  userController.receiveProjectDonationTransactions,
);
//receive profile donation transactions
router.get(
  '/receive-profile-donation-data',
  authentication.userAuthentication,
  userController.receiveProfileDonationTransactions,
);
//receive donation transactions
router.get(
  '/receive-donation-data-monthly',
  authentication.userAuthentication,
  userController.receiveDonationTransactionsMonthly,
);
// user change password
router.post(
  '/change-password',
  authentication.userAuthentication,
  validation.changePasswordValidation,
  userController.userChangePassword,
);

// user upload profile photo
router.post(
  '/profile-photo',
  authentication.userAuthentication,
  userController.userProfilePhoto,
);

//filter user
router.get(
  '/search-user',
  authentication.userAuthentication,
  userController.getDonationOfUser,
);

router.post(
  '/proxy-login',
  // authentication.userAuthentication,
  userController.adminProxyLogin,
);

router.get(
  '/active-donations',
  authentication.userAuthentication,
  userController.recurringDonars,
);

router.get(
  '/active-recieve-donations',
  authentication.userAuthentication,
  userController.recurringDonarsRecieve,
);

router.post(
  '/getDetailsByURL',
  // authentication.userAuthentication,
  userController.getDetailsByURL,
);
router.get('/get_all_users', userController.showFeaturedProfiles);
router.get('/add-users-to-list', userController.addMemberstoMailchimpList);
router.get('/donation-collected', userController.donationCollected);

router.delete(
  '/delete-account',
  authentication.userAuthentication,
  userController.deleteUserAccount,
);
router.patch(
  '/change-email',
  authentication.userAuthentication,
  userController.changeEmail,
);

//generate account link
router.post('/generate-link',authentication.userAuthentication, userController.generateAccountLink);

router.get('/project-list',authentication.userAuthentication, userController.getUserProjectList)

router.get('/donation-chart', authentication.userAuthentication, userController.getDonationChart)

router.get('/donation-analytic',authentication.userAuthentication, userController.donationAnalytic)

router.get('/total-sponsor', authentication.userAuthentication, userController.getTotalSponsor)

router.get('/export-donation-report', authentication.userAuthentication,userController.exportDonationReport)

router.all('/charge-enabled', userController.chargeEnabled)

router.get('/export-donationxls-report', authentication.userAuthentication, userController.exportDonationXlsReport)

router.get('/export-sentdonationxls-report',authentication.userAuthentication, userController.exportSentDonationXlsReport)

router.get('/export-sentdonationcsv-report', authentication.userAuthentication, userController.exportSentDonationCsvReport)

module.exports = router;
