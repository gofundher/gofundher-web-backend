'use strict';

const express = require('express');
const router = express.Router();
const authentication = require('../helpers/tokenVerification');
const donationController = require('../controllers/donation.controller');

// update user profile on database
router.post('/update_stripe_account', donationController.stripeCustomerUpdate);
router.post(
  '/update_paypal_account',
  donationController.updatePaypalAccountDetails,
);

// get user donation account data
router.get(
  '/donation-data',
  authentication.userAuthentication,
  donationController.getDonationAccData,
);

router.post('/connect-webhook', donationController.onCapabilityStatusUpdation);

router.post('/create-external-account',authentication.userAuthentication, donationController.createCustomExternalAccountStripe)
module.exports = router;
