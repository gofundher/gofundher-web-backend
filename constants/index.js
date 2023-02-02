'use strict';

const secret =
  'qwertyuiop[]lkjhgfdazxcvbnm,./!@#$%^&*()qwertyuioplkjhgfdazxcvbnm[,.]/!@#$%^&*()';

// social login client id and secret
const fbClientID = process.env.FB_CLIENT_ID;
const fbClientSecret = process.env.FB_CLIENT_SECRET;

const FrontendUrl = process.env.FRONTEND_URL;
const BackendUrl = process.env.BACKEND_URL;

const linkedinClientID=process.env.LINKEDIN_CLIENT_ID;
const linkedinClientSecret=process.env.LINKEDIN_CLIENT_SECRET;
const googleClientID=process.env.GOOGLE_CLIENT_ID;
const googleClientSecret=process.env.GOOGLE_CLIENT_SECRET;

const stripe_public_key = process.env.STRIPE_PUBLISHABLE_KEY;
const stripe_private_key = process.env.STRIPE_SECRET_KEY;

const CLIENT = process.env.PAYPAL_CLIENT;
const SECRET = process.env.PAYPAL_SECRET;
const PAYPAL_API = process.env.PAYPAL_API;

const PROJECT_STATUS = {
  LIVE: 'live',
  DRAFT: 'draft'
}

module.exports = {
  secret,
  stripe_public_key,
  stripe_private_key,
  CLIENT,
  SECRET,
  PAYPAL_API,
  fbClientID,
  fbClientSecret,
  FrontendUrl,
  BackendUrl,
  linkedinClientID,
  linkedinClientSecret,
  googleClientID,
  googleClientSecret,
  PROJECT_STATUS
};
