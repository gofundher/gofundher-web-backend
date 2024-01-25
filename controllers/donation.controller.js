/** @format */

"use strict";

const fs = require("fs");
const path = require("path");
const __basedir = path.join(__dirname, "../public");
const { stripe_private_key } = require("./../constants");
let stripe = require("stripe")(stripe_private_key);
stripe.setApiVersion("2020-08-27"); // SET API VERSION
const { Donation, User } = require("../models");
const emailSender = require("../helpers/mailSender");
const stipeApiHelper = require("../helpers/stripeApiHelper");

// TO UPDATE STRIPE INFO FOR USER
const stripeCustomerUpdate = async (req, res) => {
  try {
    const data = req.body;

    if (
      data &&
      data.userId &&
      data.routingNumber &&
      data.accountNumber &&
      data.dateOfBirth &&
      data.ssn &&
      data.ip &&
      data.mobileNumber &&
      data.state &&
      data.city &&
      data.postalCode &&
      data.address
    ) {
      // FIRST UPLOAD IMAGE TO STRIPE SERVER
      if (data.fileData) {
        data.path = __basedir + data.fileData.data;
        data.filename = data.fileData.name;
        data.mimetype = data.fileData.type;
      }
      if (data.fileData) {
        stripeImgUpload(data, res);
      } else {
        stripeAccountUpdate(data, res);
      }
    } else if (!data.userId) {
      return res.status(401).json({
        responseCode: 401,
        message: "User id not provided!",
        success: false,
      });
    } else if (!data.routingNumber) {
      return res.status(401).json({
        responseCode: 401,
        message: "Routing number not provided!",
        success: false,
      });
    } else if (!data.accountNumber) {
      return res.status(401).json({
        responseCode: 401,
        message: "Account number not provided!",
        success: false,
      });
    } else if (!data.dateOfBirth) {
      return res.status(401).json({
        responseCode: 401,
        message: "Date of birth not provided!",
        success: false,
      });
    } else if (!data.ssn) {
      return res.status(401).json({
        responseCode: 401,
        message: "SSN number not provided!",
        success: false,
      });
    } else if (!data.ip) {
      return res.status(401).json({
        responseCode: 401,
        message: "IP not provided!",
        success: false,
      });
    } else if (!data.postalCode) {
      return res.status(401).json({
        responseCode: 401,
        message: "Postal Code not provided!",
        success: false,
      });
    } else if (!data.state) {
      return res.status(401).json({
        responseCode: 401,
        message: "State not provided!",
        success: false,
      });
    } else if (!data.city) {
      return res.status(401).json({
        responseCode: 401,
        message: "City not provided!",
        success: false,
      });
    } else if (!data.address) {
      return res.status(401).json({
        responseCode: 401,
        message: "Address not provided!",
        success: false,
      });
    } else if (!data.stripeMobileNumber) {
      return res.status(401).json({
        responseCode: 401,
        message: "Contact number not provided!",
        success: false,
      });
    }
  } catch (error) {
    return res.status(400).json({
      responseCode: 400,
      message: "Error while updating stripe account!",
      error: error,
      success: false,
    });
  }
};
// TO UPDATE STRIPE INFO FOR USER

// FUNCTION TO UPLOAD IMAGE TO STRIPE
const stripeImgUpload = async (data, res) => {
  const fp = fs.readFileSync(data.path);
  await stripe.files.create(
    {
      purpose: "identity_document",
      file: {
        data: fp,
        name: data.filename,
        type: data.mimetype,
      },
    },
    async function (err, file) {
      if (err) {
        return res.status(404).json({
          responseCode: 404,
          message: "Unable to upload image on stripe!",
          error: err,
          success: false,
        });
      } else {
        data.stripeFileId = file.id;
        await Donation.update(
          {
            identity_doc: data.fileData.data,
          },
          {
            where: {
              user_id: data.userId,
            },
          }
        );
        // UPDATE ACCOUNT INFORMATION
        stripeAccountUpdate(data, res);
      }
    }
  );
};
// FUNCTION TO UPLOAD IMAGE TO STRIPE

// FUNCTION TO UPDATE ACCOUNT ON STRIPE
const stripeAccountUpdate = async (data, res) => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const dobDate = new Date(data.dateOfBirth);
  const day = dobDate.getDate();
  const month = dobDate.getMonth() + 1;
  const year = dobDate.getFullYear();
  if (!data.userId) {
    return res.status(400).json({
      message: "User Id Not Found",
    });
  }
  if (year > currentYear - 13) {
    return res.status(400).json({
      message: "You must have 13 years of age to use stripe",
    });
  }
  const donateData = await Donation.findOne({
    where: { user_id: data.userId },
  });

  if (!donateData) {
    return res.status(422).json({
      responseCode: 422,
      message: "No donate data to update!",
      success: false,
    });
  }
  const userData = await User.findOne({
    where: {
      id: data.userId,
    },
  });
  let stripeConnectedAccountStatus = await stipeApiHelper.retrieveAccountInfo(
    donateData.account_id
  );
  if (
    stripeConnectedAccountStatus &&
    stripeConnectedAccountStatus.identityVerification &&
    stripeConnectedAccountStatus.identityVerification.status !== "verified" &&
    data.stripeFileId
  ) {
    data.accountId = donateData.account_id;
    let accountData = {
      first_name: userData.first_name,
      dob: {
        day: day,
        month: month,
        year: year,
      },
      last_name: userData.last_name,
      email: userData.email,
      phone: data.mobileNumber,
      address: {
        line1: data.address,
        city: data.city,
        state: data.state,
        postal_code: data.postalCode,
      },
      verification: {
        document: {
          front: data.stripeFileId,
        },
      },
    };
    if (data.personal_id_number) {
      accountData.id_number = data.personal_id_number;
      accountData.ssn_last_4 = data.ssn;
    }
    await stripe.accounts.update(
      donateData.account_id,
      {
        individual: accountData,
        business_type: "individual",
      },
      async function (err, success) {
        if (err) {
          return res.status(404).json({
            responseCode: 404,
            message: "Unable to update account info on stripe!",
            error: err,
            success: false,
          });
        } else {
          if (success && success.id) {
            await User.update(
              {
                is_acc_updated: true,
              },
              {
                where: {
                  id: data.userId,
                },
              }
            );
            await Donation.update(
              {
                date_of_birth: data.dateOfBirth,
                ssn: data.ssn,
                account_number: data.accountNumber,
                routing_number: data.routingNumber,
                address: data.address,
                city: data.city,
                phone: data.mobileNumber,
                state: data.state,
                postal_code: data.postalCode,
              },
              {
                where: {
                  user_id: data.userId,
                },
              }
            );
            new emailSender().sendMail(
              [userData.email],
              "Bank account updated successfully",
              "",
              "CashFundHer",
              "",
              "bankAccountUpdated",
              {
                first_name: userData.first_name,
                last_name: userData.last_name,
              },
              true
            );
            createExternalAccountStripe(data, res, userData);
          }
        }
      }
    );
  } else {

    let accountData = {
      first_name: userData.first_name,
      dob: {
        day: day,
        month: month,
        year: year,
      },
      last_name: userData.last_name,
      email: userData.email,
      phone: data.mobileNumber,
      address: {
        line1: data.address,
        city: data.city,
        state: data.state,
        postal_code: data.postalCode,
      },
    };
    if (data.personal_id_number) {
      accountData.id_number = data.personal_id_number;
      accountData.ssn_last_4 = data.ssn;
    }
    await stripe.accounts.update(
      donateData.account_id,
      {
        // account_token: token.id,
        individual: accountData,
        business_type: "individual",
        // tos_shown_and_accepted: true,
        capabilities: {
          card_payments: {
            requested: true,
          },
          transfers: {
            requested: true,
          },
        },
        business_profile: {
          mcc: "7399",
          url: "https://www.cashfundher.com/",
        },
      },
      async function (err, success) {
        if (err) {
          return res.status(404).json({
            responseCode: 404,
            message: "Unable to update account info on stripe!",
            error: err,
            success: false,
          });
        } else {
          await Donation.update(
            {
              date_of_birth: data.dateOfBirth,
              ssn: data.ssn,
              account_number: data.accountNumber,
              routing_number: data.routingNumber,
              address: data.address,
              city: data.city,
              phone: data.mobileNumber,
              state: data.state,
              postal_code: data.postalCode,
            },
            {
              where: {
                user_id: data.userId,
              },
            }
          );
          data.accountId = donateData.account_id;
          createExternalAccountStripe(data, res, userData);
        }
      }
    );
  }
  if (!donateData) {
    return res.status(400).json({
      message: "Donate data not found",
    });
  }
};
// FUNCTION TO UPDATE ACCOUNT ON STRIPE

// FUNCTION TO CREATE EXTERNAL ACCOUNT ON STRIPE
const createExternalAccountStripe = async (data, res, userData) => {
  await stripe.accounts.createExternalAccount(
    data.accountId,
    {
      external_account: {
        object: "bank_account",
        country: "US",
        currency: "USD",
        account_number: data.accountNumber,
        routing_number: data.routingNumber,
        default_for_currency: true,
      },
    },
    function (err, bank_account) {
      if (err) {
        return res.status(404).json({
          responseCode: 404,
          message: "Unable to create external account on stripe!",
          error: err,
          success: false,
        });
      } else {
        if (bank_account && bank_account.id) {
          // update tos acceptance in account
          stripe.accounts.update(
            data.accountId,
            {
              tos_acceptance: {
                date: Math.floor(Date.now() / 1000),
                ip: data.ip,
              },
            },
            async function (e, accUpd) {
              if (e) {
                return res.status(400).json({
                  message: "Error While Updating Stripe external account",
                  error: e,
                });
              } else {
                await Donation.update(
                  {
                    routing_number: data.routingNumber,
                    account_number: data.accountNumber,
                    ssn: data.ssn,
                  },
                  {
                    where: {
                      user_id: data.userId,
                    },
                  }
                );
                let stripeConnectedAccountStatus =
                  await stipeApiHelper.retrieveAccountInfo(data.accountId);
                return res.status(200).json({
                  responseCode: 200,
                  message: "Update process on stripe completes!",
                  success: true,
                  stripeConnectedAccountStatus,
                });
              }
            }
          );
        }
      }
    }
  );
};
// FUNCTION TO CREATE EXTERNAL ACCOUNT ON STRIPE

// FUNCTION TO GET DONATION Acount DATA OF SINGLE USER
const getDonationAccData = async (req, res) => {
  const { query } = req;
  const { userId } = query;
  try {
    if (!userId) {
      return res.status(400).json({
        responseCode: 400,
        message: "User Id not provided",
        success: false,
      });
    }
    const user = await User.findByPk(userId, {
      attributes: ['is_paypal_connected']
    });

    const donationData = await Donation.findOne({
      where: {
        user_id: userId,
      },
    });

    if (!donationData) {
      return res.status(400).json({
        responseCode: 400,
        message: "Donation Account not found",
        success: false,
      });
    }

    const stripeConnectedAccountStatus = await stipeApiHelper.retrieveAccountInfo(
      donationData.account_id
    );

    return res.status(200).json({
      responseCode: 200,
      data: donationData,
      paypalOnboardingStatus: donationData.paypal_onboarding_status,
      isPaypalConnected: user.is_paypal_connected,
      stripeConnectedAccountStatus,
      success: true,
    });

  } catch (error) {

    return res.status(500).json({
      responseCode: 500,
      message: "Error while fetching projects for user!",
      error: error,
      success: false,
    });
  }
};
// FUNCTION TO GET DONATION Acount DATA OF SINGLE USER

// Function to update paypal account details
const updatePaypalAccountDetails = async (req, res) => {
  const {
    body: {
      email,
      mobileNumber,
      userId,
      paypal_photo_id,
      paypalCountry,
      paypalState,
      paypalCity,
    },
  } = req;

  try {
    const isPaypalConnected = !!email || !!mobileNumber;
    const donationData = await Donation.findOne({
      where: {
        user_id: userId,
      },
      attributes: ["user_id"],
    });
    const payload = {
      paypal_email: email,
      paypal_mobile: mobileNumber,
      paypal_photo_id: paypal_photo_id,
      paypal_country: paypalCountry,
      paypal_state: paypalState,
      paypal_city: paypalCity,
    };
    if (donationData) {
      await Donation.update(payload, {
        where: {
          user_id: userId,
        },
      });
    } else {
      await Donation.create({
        ...payload,
        user_id: userId,
      });
    }
    await User.update(
      {
        is_paypal_connected: isPaypalConnected,
      },
      {
        where: {
          id: userId,
        },
      }
    );
    const userData = await User.findOne({
      where: {
        id: userId,
      },
      attributes: ["email", "first_name", "last_name"],
    });
    if (isPaypalConnected) {
      await new emailSender().sendMail(
        [userData.email],
        "Paypal account update success",
        "",
        "CashFundHer",
        "",
        "paypalTemplate",
        {
          first_name: userData.first_name,
          last_name: userData.last_name,
        },
        true
      );
    }
    return res.status(200).json({
      responseCode: 200,
      message: "Details updated successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: "Error while updating the credentials",
      error: error,
      success: false,
    });
  }
};

const onCapabilityStatusUpdation = async (req, res) => {
  const {
    body: { account, data },
  } = req;
  const donationData = await Donation.findOne({
    where: {
      account_id: account,
    },
  });
  if (donationData) {
    const userData = await User.findOne({
      where: { id: donationData.dataValues.user_id },
    });
    if (data.object.payouts_enabled && data.object.charges_enabled) {
      await User.update(
        {
          is_verified: true,
          is_acc_updated: true,
        },
        {
          where: {
            id: userData.id,
          },
        }
      );
      if (!userData.is_verified) {
        await new emailSender().sendMail(
          [userData.email],
          "Bank account verification success",
          "",
          "CashFundHer",
          "",
          "bankAccountVerification",
          {
            first_name: userData.first_name,
            last_name: userData.last_name,
          },
          true
        );
      }
    }
    return res.status(200).json({
      responseCode: 200,
      success: true,
    });
  } else {
    return res.status(500).json({
      responseCode: 500,
      success: false,
    });
  }
};
const getIpAddress = (req) => {
  var ip = null;
  try {
    ip =
      (req.headers["x-forwarded-for"] || "").split(",").pop() ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress;
  } catch (ex) {
    ip = null;
  }
  return ip;
};

// FUNCTION TO CREATE EXTERNAL ACCOUNT ON STRIPE
const createCustomExternalAccountStripe = async (req, res) => {
  try {
    const { body } = req;
    const { accountId, accountNumber, routingNumber, ip, userId } = body;
    let ipAddrress = getIpAddress(req);

    await stripe.accounts.createExternalAccount(
      accountId,
      {
        external_account: {
          object: "bank_account",
          country: "US",
          currency: "USD",
          account_number: accountNumber,
          routing_number: routingNumber,
          default_for_currency: true,
        },
      }, function (err, bank_account) {

        if (err) {
          return res.status(404).json({
            responseCode: 404,
            message: "Unable to create external account on stripe!",
            error: err,
            success: false,
          });
        } else {
          if (bank_account && bank_account.id) {
            // update tos acceptance in account
            stripe.accounts.update(
              accountId,
              {
                tos_acceptance: {
                  date: Math.floor(Date.now() / 1000),
                  ip: ipAddrress,
                },
              },
              async function (e, accUpd) {
                if (e) {
                  return res.status(400).json({
                    message: "Error While Updating Stripe external account",
                    error: e,
                  });
                } else {
                  await Donation.update(
                    {
                      routing_number: routingNumber,
                      account_number: accountNumber,
                    },
                    {
                      where: {
                        user_id: userId,
                      },
                    }
                  );
                  let stripeConnectedAccountStatus =
                    await stipeApiHelper.retrieveAccountInfo(accountId);
                  return res.status(200).json({
                    responseCode: 200,
                    message: "Update process on stripe completes!",
                    success: true,
                    stripeConnectedAccountStatus,
                  });
                }
              }
            );
          }
        }
      }
    );
  } catch (error) {

    return res.status(500).json({
      responseCode: 500,
      success: false,
    });
  }
};

module.exports = {
  stripeCustomerUpdate,
  getDonationAccData,
  updatePaypalAccountDetails,
  onCapabilityStatusUpdation,
  createCustomExternalAccountStripe,
};
