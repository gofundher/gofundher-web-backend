/** @format */

const { stripe_private_key, FrontendUrl } = require('./../constants');
let stripe = require('stripe')(stripe_private_key);

const retrieveAccountInfo = async accountId => {
  const connectedAccountInfo = await stripe.accounts.retrieve(accountId);
  let stripeConnectedAccountStatus = {};
  if (connectedAccountInfo) {
    const {
      charges_enabled = false,
      payouts_enabled = false,
      details_submitted = false,
      legal_entity = {},
      verification = {},
      capabilities = {},
      type,
      future_verification,
      external_accounts
    } = connectedAccountInfo || {};
    stripeConnectedAccountStatus = {
      charges_enabled,
      payouts_enabled,
      identityVerification: legal_entity.verification,
      legalEntityInfo: legal_entity,
      verification,
      details_submitted,
      capabilities,
      futureVerfication:future_verification,
      accountType:type,
      externalAccount:external_accounts
    };
  }
  return stripeConnectedAccountStatus;
};

const createBaseSession = async ({ line_items, mode = 'payment',metadata, accountId, ...otherArgs }) => {
  
  const session = await stripe.checkout.sessions.create({
    line_items,
    mode,
    metadata,
    success_url: `${FrontendUrl}/success`,
    cancel_url: `${FrontendUrl}/cancel`,
    ...otherArgs
  }, {
    stripe_account: accountId
  }
  );
  const { url, id } = session;

  return { id, url }
}

const createSubscriptionSession = async ({line_items, metadata, application_fee_percent,accountId,...otherArgs}) => {
  const subscription_data = {};

  if (metadata) {
    subscription_data.metadata = metadata
  }

  let feesAmount = 0;
  
  if (application_fee_percent && accountId) {
    const totalAmount = line_items.reduce((total, item) => total + item.price_data.unit_amount, 0);
    feesAmount =  Number(((totalAmount/100)*application_fee_percent).toFixed(2));
    const newApplicationFeePercentage = (feesAmount/(feesAmount+totalAmount)*100).toFixed(2);
    subscription_data.application_fee_percent = newApplicationFeePercentage;
  }

  const recurringItems = line_items.map(item => ({
    ...item,
    price_data:{
      ...item.price_data,
      unit_amount: Number(((item.price_data.unit_amount + feesAmount) * 100).toFixed(2)),
      recurring: {
        interval: 'month',
        interval_count:1,
      },
    }
  }));

  return createBaseSession({ mode: 'subscription', subscription_data,accountId, line_items: recurringItems, metadata, ...otherArgs });
}

const createPaymentSession = async ({line_items, metadata, application_fee_percent, ...args}) => {

  const payment_intent_data = {};
  if (metadata) {
    payment_intent_data.metadata = metadata
  }
  let feesAmount = 0;
  if (application_fee_percent) {
    const totalAmount = line_items.reduce((total, item) => total + item.price_data.unit_amount, 0);
    feesAmount =  ((totalAmount/100)*application_fee_percent);
    payment_intent_data.application_fee_amount = Number(feesAmount*100).toFixed(0);
  }
  
  const newItems = line_items.map(item => ({
    ...item,
    price_data:{
        ...item.price_data,
        unit_amount: Number(((item.price_data.unit_amount + feesAmount) * 100).toFixed(2)),
    }
  }));

  return createBaseSession({mode: 'payment',line_items: newItems, payment_intent_data, metadata, ...args });
}

module.exports = {
  retrieveAccountInfo,
  createSubscriptionSession,
  createPaymentSession
};
