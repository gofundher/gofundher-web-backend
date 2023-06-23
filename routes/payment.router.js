'use strict';

const express = require('express');
const router = express.Router();
const authentication = require('../helpers/tokenVerification');
const paymentController = require('../controllers/payment.controller');
const ipnHandler = require('../controllers/ipn.controller');
const rateLimit =  require('express-rate-limit');

const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: process.env.NODE_ENV === 'production' ? 15 : 2, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message:
		'You tried to sponsor without completing the process too many times. Please try again after 15 minutes.',
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers,
  handler: (_, response, _2, options) =>
		response.status(options.statusCode).json({
      message: options.message,
      success: false
    }),
});

const { addPlan, updateCapabilities } = require('../controllers/user.controller');

router.post(
  '/unsubscribe-payment',
  authentication.authorize,
  paymentController.UnSubscribeRecurringPayment,
);

router.post(
  '/subscribe/plan',
  authentication.authorize,
  paymentController.onSubscribePaypalPlan,
);

router.post('/monthly-donation', paymentController.recurringChargeWebhook);

router.post('/webhook-handler', paymentController.paypalWebhooks);

router.post('/ipn-notification', ipnHandler);

router.get('/add-plan', addPlan);

router.get('/update-connect', updateCapabilities);

router.post('/create-session', authentication.authorize, paymentController.checkoutSession )

// create direct payment intent
router.post('/stripe/create-payment-intent', authentication.authorize, paymentController.createStripePaymentIntent);

// stripe webhook
router.post('/stripe/webhook', authentication.authorize, paymentController.stripeWebhookHandler);

// create paypal onboarding link
router.post('/paypal/create-onboarding-link', authentication.authorize, paymentController.createPaypalOnboardingLink);

// create paypal order link
router.post('/paypal/create-order', /*apiLimiter,*/ authentication.authorize, paymentController.createPaypalOrder);

// handle paypal webhooks
router.post('/paypal/webhook', authentication.authorize, paymentController.paypalWebhookHandler);

// handle paypal onboarding redirect
router.get('/paypal/onboarding-return-url', authentication.authorize, paymentController.paypalOnboardingReturnHandler);

// update paypal subscription after payment
router.post('/paypal/update-subscription', authentication.authorize, paymentController.updateSubscriptionOrder);

module.exports = router;
