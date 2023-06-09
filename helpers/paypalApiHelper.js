const unirest = require('unirest');
const {
  BackendUrl
} = require('./../constants');
const { PAYPAL_BUSINESS_API_URL, PAYPAL_BUSINESS_CLIENT_ID, PAYPAL_BUSINESS_SECRET, PAYPAL_BUSINESS_PRODUCT_ID, PAYPAL_CLIENT, PAYPAL_SECRET } = process.env;

const createProduct = async () => {
  try {
    const product = {
      name: 'Go Fund Her',
      description: 'Donation For GoFundHer.com',
      "type": "SERVICE",
    "category": "SOFTWARE",
      image_url: "https://example.com/streaming.jpg",
      home_url: "https://cofundher.com",
    }
    const productResponse = await paypalPostRequest('/v1/catalogs/products', { payload: JSON.stringify(product) });

      console.log({productResponse})
  } catch (error) {
  }
  
}

const PAYPAL_HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  // 'PayPal-Partner-Attribution-Id': 'LogicblockIncPPCP_Cart'
};

const paypalPostRequest = async (path, { payload }) => {
  const token = await getAccessToken();
  console.log('--------------paypal access token--------', token);
  return unirest.post(`${PAYPAL_BUSINESS_API_URL}${path}`)
          .headers({
            ...PAYPAL_HEADERS,
            'Authorization': `Bearer ${token}`,
          })
          .send(payload);
}

const paypalGetRequest = async ({path}) => {
  const token = await getAccessToken();
  return unirest.get(PAYPAL_BUSINESS_API_URL + path)
          .headers({
           ...PAYPAL_HEADERS,
            'Authorization': `Bearer ${token}`,
          })

}

const getPaypalOrderId = async ({ amount, merchantId, customId, platformFee }) => {
  const payload = {
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: 'USD',
        value: Number(amount).toFixed(2)
      },
      payee: {
        merchant_id: merchantId
      },
      payment_instruction: {
        disbursement_mode: 'INSTANT',
        platform_fees: [{
          amount: {
            currency_code: 'USD',
            value: Number(platformFee).toFixed(2)
          },
          payee: {
            merchant_id: process.env.PAYPAL_BUSINESS_MERCHANT_ID
          },
        }]
      },
      custom_id: customId
    }]
  }

  console.log('-----------paypal order request payload -----------', payload);
  const response = await paypalPostRequest('/v2/checkout/orders', { payload });

  console.log('-----------paypal response------------', response.body);

  return response.body.id;
}

const getEmailPaypalOrderId = async ({ amount, customId }) => {
  const payload = {
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: 'USD',
        value: Number(amount).toFixed(2)
      },
      payee: {
        merchant_id: process.env.PAYPAL_MERCHANT_ID
      },
      payment_instruction: {
        disbursement_mode: 'INSTANT'
      },
      custom_id: customId
    }]
  }

  const response = await paypalPostRequest('/v2/checkout/orders', { payload });

  return response.body.id;
}

const getPartnersReferralPayload = async ({ userId }) => {
  const payload = {
    "tracking_id": `${userId}`,
    "partner_config_override": {
      "partner_logo_url": "https://cofundher.com/assets/img/gofundher-logo-new.png",
      "return_url": `${BackendUrl}/api/payment/paypal/onboarding-return-url`,
      "return_url_description": "the url to return the merchant after the paypal onboarding process.",
      // "action_renewal_url": `${FrontendUrl}/get-paid-now`,
      "show_add_credit_card": true
    },
    "operations": [{
      "operation": "API_INTEGRATION",
      "api_integration_preference": {
        "rest_api_integration": {
          "integration_method": "PAYPAL",
          "integration_type": "THIRD_PARTY",
          "third_party_details": {
            "features": [
              "PAYMENT",
              "REFUND"
            ]
          }
        }
      }
    }],
    "products": [
      "PPCP"
    ],
    "legal_consents": [{
      "type": "SHARE_DATA_CONSENT",
      "granted": true
    }]
  };

  const response = await paypalPostRequest('/v2/customer/partner-referrals', { payload });

  return response.body;
}

const createPlan = async (planName, description) => {
  
    const billingPlanAttribs = {
        "product_id": PAYPAL_BUSINESS_PRODUCT_ID,
        "name": planName,
        "description":description,
        "status": "ACTIVE",
        "billing_cycles": [
            {
            "frequency": {
              "interval_unit": "MONTH",
              "interval_count": 1
            },
            "total_cycles":0,
            "tenure_type": "REGULAR",
            "type":"INFINITE",
            "sequence":1,
            "pricing_scheme": {
              "fixed_price": {
                "value": "1",
                "currency_code": "USD"
              }
            }
          }
        ],
        "payment_preferences": {
          "auto_bill_outstanding": true,
          "setup_fee_failure_action": "CONTINUE",
          "payment_failure_threshold": 3
        },
        "quantity_supported":true
      };
        const planData = await paypalPostRequest('/v1/billing/plans', { payload: JSON.stringify(billingPlanAttribs) })
          
      if (!planData.body.id) {
        return null;
      }
      
      return  planData.body.id;
           
}

const cancelSubscription = async (subscriptionID) => {
    try {
     
      const result = await paypalPostRequest(`/v1/billing/subscriptions/${subscriptionID}/cancel`, { payload: JSON.stringify({reason:"Already Funded"}) })

          if (result.code === 204) {
          return {
            isError:false
          }
        }
        else{
          return {
            isError:true
          }
        }
      } catch (error) {
        console.log(error,'caught error');
        return {
            isError:true,
            message:"Error while creatung the plan"
        }
      }
}

const createPayout = async (receiverEmail, receiverPhone ,amount, donationId) => {
  console.log(receiverEmail, receiverPhone ,amount, donationId, 'createPayout');

  try {
        let data = {
          "sender_batch_header": {
              "email_subject": "You have a payout!",
              "email_message": "You have received a payout from gofundher! Thanks for using our service!"
            },
            "items": [
              receiverEmail ? {
                "recipient_type": "EMAIL",
                "amount": {
                  "value": amount,
                  "currency": "USD"
                },
                "note": "Thanks for your using our service!",
                "sender_item_id": `GFH-${donationId}`,
                "receiver": receiverEmail,
                "notification_language": "en-US"
              } : {
                "recipient_type": "PHONE",
                "amount": {
                  "value": amount,
                  "currency": "USD"
                },
                "note": "Thanks for your using our service!",
                "sender_item_id": donationId,
                "receiver": receiverPhone,
                "notification_language": "en-US"
              },
            ]
       }
        const result = await paypalPostRequest(`/v1/payments/payouts`, { payload: JSON.stringify(data) })

        if (result.code === 201) {
          return {
            isError:false,
            data: result.body
          }
        }
        else{
          return {
            isError:true,
            data: result.body
          }
        }
      } catch (error) {
        console.log(error,'caught error');
        return {
            isError:true,
            message:"Error while creatung the plan"
        }
      }
}

const getBillingAgreementDetail = async (subscriptionID) => {
  try {
    const { code, body } = await paypalGetRequest(`/v1/billing/subscriptions/${subscriptionID}`);

      if (code === 200) {
      return {
        isError: false,
        data: body
      }
    }
    else{
      return {
        isError:true
      }
    }
  } catch (error) {
    console.log(error,'caught error');
    return {
        isError:true,
        message:"Error while creatung the plan"
    }
  }
}

const getAccessToken = async () => {
  console.log("-----------------------------------------------");
  console.log(`${PAYPAL_BUSINESS_API_URL}/v1/oauth2/token`);
  const {body: {access_token}} = await unirest.post(`${PAYPAL_BUSINESS_API_URL}/v1/oauth2/token`)
  .headers({'Accept': 'application/json', 'Accept-Language': 'en_US'})
  .auth({
    user: PAYPAL_BUSINESS_CLIENT_ID,
    pass: PAYPAL_BUSINESS_SECRET,
    sendImmediately: true
  })
  .form({grant_type: 'client_credentials'});

  return access_token;
}

module.exports = {
    createPlan,
    cancelSubscription,
    createPayout,
    getBillingAgreementDetail,
    // Mouhsine bakhich
    getAccessToken,
    getPartnersReferralPayload,
    paypalGetRequest,
    getPaypalOrderId,
    getEmailPaypalOrderId,
    createProduct
}