/** @format */

"use strict";

const {
  User,
  Donation,
  Finance,
  Project,
  RecurringDonars,
  sequelize
} = require("../models");
const {
  secret,
  stripe_private_key,
  BackendUrl
} = require("./../constants");
const {
  createPlan
} = require("../helpers/paypalApiHelper");
const emailSender = require("../helpers/mailSender");
const {
  validationResult
} = require("express-validator/check");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const __basedir = path.join(__dirname, "../public");
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../config/server-config.json")[env];
const Sequelize = require("sequelize");
const {
  QueryTypes
} = require("sequelize");
const Op = Sequelize.Op;
const salt = bcrypt.genSaltSync(10);
const stripe = require("stripe")(stripe_private_key);
const passport = require("passport");
const FacebookStrategy = require("passport-facebook").Strategy;
const LinkedInStrategy = require("passport-linkedin-oauth2").Strategy;
const GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;
const {
  fbClientID,
  fbClientSecret,
  linkedinClientID,
  linkedinClientSecret,
  googleClientID,
  googleClientSecret,
} = require("../constants");
const addMemberToList = require("../helpers/mailChimpApiHelper");
const moment = require("moment");
const excel = require("node-excel-export");

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

stripe.setApiVersion("2020-08-27"); // SET API VERSION

/* function To generate slug for creating profileUrl  */
var count = 1;
const generateprofileUrl = async (slug) => {
  var courseCheck = await User.findAndCountAll({
    where: {
      profileUrl: slug + count
    },
  });
  var courseCheckProfile = await Project.findAndCountAll({
    where: {
      url: slug + count
    },
  });
  if (courseCheck.count == 0 && courseCheckProfile.count == 0) {
    slug = slug + count;
    return slug;
  } else {
    count++;
    return await generateprofileUrl(slug);
  }
};

// Stripe webhook
const stripeLiveWebhook = async (req, res) => {
  try {
    return res.status(200).json({
      responseCode: 200,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responsecode: 500,
      message: error.message ? error.message : "Unexpected error occure.",
      success: false,
    });
  }
};

//Proxy login
const adminProxyLogin = async (req, res) => {
  const {
    body
  } = req;
  const {
    id
  } = body;
  try {
    const result = await User.findOne({
      where: {
        id: id,
      },
    });
    if (!result) {
      return res.status(404).json({
        responseCode: 404,
        message: "Data not found.",
        success: true,
      });
    }
    const token = jwt.sign({
        id: result.id,
        email: result.email,
        randomKey: salt,
      },
      secret, {
        expiresIn: 86400,
      }
    );

    return res.status(200).json({
      responseCode: 200,
      token: token,
      data: result,
      message: "Login Successful.",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responsecode: 500,
      message: error.message ? error.message : "Unexpected error occure.",
      success: false,
    });
  }
};

const userSignup = async (req, res) => {
  try {
    const data = req.body;

    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        responseCode: 422,
        message: "Please enter valid Email ID and Password!",
        error: errors.array(),
        success: false,
      });
    }

    const userRec = await User.findOne({
      where: {
        email: data.email,
      },
    });

    if (userRec) {
      if (userRec.is_social === false) {
        return res.status(401).json({
          responseCode: 401,
          message: "This Email Address is already registered with us. Please try to register with another Email Address.",
          success: false,
        });
      }

      const hashPassword = await bcrypt.hashSync(data.password, salt);
      await User.update({
        password: hashPassword
      }, {
        where: {
          id: userRec.id
        }
      });
      const token = jwt.sign({
        id: userRec.id,
        randomKey: salt
      }, secret, {
        expiresIn: 86400,
      });

      return res.status(500).json({
        responseCode: 500,
        message: "User already signup from social",
        success: false,
      });
    } else {
      const hashPassword = await bcrypt.hashSync(data.password, salt);
      const data1 = data.firstName.replace(/\s+/g, "-");
      const data2 = data.lastName.replace(/\s+/g, "-");
      var testSlug = [data1, data2].join("-");
      let slugCheck = "";
      let slugCheckProfile = "";

      slugCheckProfile = await Project.findAndCountAll({
        where: {
          url: testSlug,
          is_deleted: {
            [Op.ne]: true,
          },
        },
      });

      slugCheck = await User.findAndCountAll({
        where: {
          profileUrl: testSlug,
          is_deleted: {
            [Op.ne]: true,
          },
        },
      });
      let slug = "";
      if (slugCheck.count > 0 || slugCheckProfile.count > 0) {
        testSlug += "-";
        slug = await generateprofileUrl(testSlug.toLowerCase());
      } else {
        slug = testSlug.toLowerCase();
      }
      const planId = await createPlan(
        `Donation for ${data.firstName} ${data.lastName}`,
        `Donation for ${data.firstName} ${data.lastName}`
      );

      await User.build({
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          password: hashPassword,
          street: "",
          city: "",
          state: "",
          zip: "",
          phone: "",
          personal_website: "",
          facebook: "",
          twitter: "",
          bio: "",
          is_receive_news: 0,
          avatar: "",
          is_social: 0,
          forget_token: "",
          is_verified: 0,
          is_acc_updated: 0,
          last_login: new Date(),
          profileUrl: slug,
          isActive: 1,
          anonymousUser: 0,
          is_newsletter_subscribed: 1,
          plan_id: planId,
        })
        .save()
        .then(async (userRes) => {
          if (userRes.dataValues && userRes.dataValues.id) {
            const token = jwt.sign({
                id: userRes.dataValues.id,
                randomKey: salt
              },
              secret, {
                expiresIn: 86400,
              }
            );
            // Add members to mailing list
            const addMember = await addMemberToList(
              data.email,
              false,
              "",
              userRes.dataValues.id,
              data.firstName,
              data.lastName
            );
            new emailSender().sendMail(
              [userRes.dataValues.email],
              "Your CashFundHer account is ready",
              " ",
              "CashFundHer",
              // project.User ? project.User.email : "",
              " ",
              "registration", {
                first_name: userRes.dataValues.first_name,
                last_name: userRes.dataValues.last_name,
              },
              true
            );
            return res.status(200).json({
              responseCode: 200,
              token: token,
              message: "User signup successfully",
              data: userRes.dataValues,
              success: true,
            });
          }
        })
        .catch((err) => {});
    }
  } catch (error) {
    return res.status(400).json({
      responseCode: 400,
      message: "Error while signup user!",
      error: error,
      success: false,
    });
  }
};

// USER SIGNIN API
const userSignin = async (req, res) => {
  try {
    const data = req.body;
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        responseCode: 422,
        message: "Please enter valid Email ID and Password!",
        error: errors.array(),
        success: false,
      });
    }

    const userRec = await User.findOne({
      where: {
        email: data.email,
        is_deleted: {
          [Op.ne]: true,
        },
      },
    });

    if (!userRec) {
      return res.status(401).json({
        responseCode: 401,
        message: "Email Address is not Registered with us. Please try to login with registered email address.",
        success: false,
      });
    }

    if (!userRec.isActive) {
      return res.status(401).json({
        responseCode: 401,
        message: "Your account has been suspended! Please contact admin.",
        success: false,
      });
    }
    const passwordMatch = await bcrypt.compareSync(
      data.password,
      userRec.password
    );
    if (!passwordMatch) {
      return res.status(401).json({
        responseCode: 401,
        message: "Please enter valid Email ID and Password!",
        success: false,
      });
    }

    // SUCCESS
    const token = jwt.sign({
      id: userRec.id,
      randomKey: salt
    }, secret, {
      expiresIn: 86400,
    });

    // save last login datetime details
    await User.update({
      last_login: new Date()
    }, {
      where: {
        id: userRec.id
      }
    });

    return res.status(200).json({
      responseCode: 200,
      data: userRec,
      token: token,
      message: "Welcome to cashfundher ",
      success: true,
    });
  } catch (error) {
    return res.status(400).json({
      responseCode: 400,
      message: "Error while login user!",
      error: error,
      success: false,
    });
  }
};
// USER SIGNIN API

// CREATE STRIPE CUSTOMER
/**
 * First create stripe account
 * If error, delete acccount from database as well
 * and notify the user
 * send welcome email as well for user
 **/
const stripeCustomerCreate = async (userData, accountData) => {
  const createResult = await stripe.accounts.create({
    type: "standard",
    country: "US",
    email: userData.email,
    business_type: "individual",
    // statement_descriptor: "Donation-CashFundHer.com",
    // requested_capabilities: ['card_payments', 'transfers'],
    business_profile: {
      mcc: "7399",
      url: "https://www.cashfundher.com/",
    },
  });

  console.log("create result", createResult);
  if (createResult && createResult.id) {
    if (accountData && accountData.id) {
      await Donation.update({
        user_id: userData.userId,
        account_id: createResult.id,
        is_verified: 0,
      }, {
        where: {
          user_id: userData.userId,
        }
      });
    } else {
      await Donation.create({
        user_id: userData.userId,
        account_id: createResult.id,
        is_verified: 0,
      });
    }
    return {
      account_id: createResult.id,
    };
  }
};
// CREATE STRIPE CUSTOMER

// social LOGIN
const socialSignup = async (req, accessToken, refreshToken, profile, done) => {
  if (profile && profile.emails && profile.emails[0].value) {
    const element = profile.emails[0].value;
    const errors = await validationResult(element);

    if (!errors.isEmpty()) {
      return res.status(422).json({
        responseCode: 422,
        message: "Validation error!",
        error: errors.array(),
        success: false,
      });
    }
  }
  let users = "";
  // email already exist
  if (profile.emails) {
    users = await User.findOne({
      where: {
        email: profile.emails[0].value
      },
    });
  }
  var profileslug = [profile.name.givenName, profile.name.familyName]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, "-")
    .toLowerCase();
  let slugCheck = "";
  let slugCheckProfile = "";
  slugCheckProfile = await Project.findAndCountAll({
    where: {
      url: profileslug,
      is_deleted: {
        [Op.ne]: true,
      },
    },
  });
  slugCheck = await User.findAndCountAll({
    where: {
      profileUrl: profileslug,
      is_deleted: {
        [Op.ne]: true,
      },
    },
  });
  let slug = "";
  if (slugCheck.count > 0 || slugCheckProfile > 0) {
    profileslug += "-";
    slug = await generateprofileUrl(profileslug.toLowerCase());
  } else {
    slug = profileslug.toLowerCase();
  }
  let error = false;
  if (!users) {
    const planId = await createPlan(
      `Donation for ${profile.name.givenName}`,
      `Donation for ${profile.name.givenName}`
    );
    let result = await User.build({
      first_name: profile.name.givenName,
      last_name: profile.name.familyName,
      email: profile.emails ? profile.emails[0].value : "",
      password: "",
      street: "",
      city: "",
      state: "",
      zip: "",
      phone: "",
      personal_website: "",
      facebook: "",
      twitter: "",
      bio: "",
      is_receive_news: 0,
      avatar: profile.provider === "facebook" ?
        `https://graph.facebook.com/${profile.id}/picture?type=large` :
        profile.photos[0].value,
      is_social: 1,
      forget_token: "",
      is_verified: 0,
      is_acc_updated: 0,
      last_login: new Date(),
      profileUrl: slug,
      isActive: 1,
      anonymousUser: 0,
      is_newsletter_subscribed: 1,
      plan_id: planId,
    }).save();
    users = result.dataValues;
    // To add users automatically to mailchimp mailing list
    await addMemberToList(
      users.email,
      false,
      "",
      users.id,
      users.first_name,
      users.last_name
    );
    new emailSender().sendMail(
      [users.email],
      "Your CashFundHer account is ready",
      " ",
      "CashFundHer",
      // project.User ? project.User.email : "",
      " ",
      "registration", {
        first_name: users.first_name,
        last_name: users.last_name,
      },
      true
    );
  }
  const token = jwt.sign({
    id: users.id,
    randomKey: salt
  }, secret, {
    expiresIn: 86400,
  });

  if (error) {
    done(null, {});
  }

  done(null, {
    token: token,
    id: users.id
  });
};
//FACEBOOK LOGIN
passport.use(
  new FacebookStrategy({
      clientID: fbClientID,
      clientSecret: fbClientSecret,
      callbackURL: `${BackendUrl}/auth/facebook/callback`,
      passReqToCallback: true,
      profileFields: ["id", "name", "displayName", "photos", "email"],
    },
    socialSignup
  )
);

// LINKEDIN LOGIN
passport.use(
  new LinkedInStrategy({
      clientID: linkedinClientID,
      clientSecret: linkedinClientSecret,
      callbackURL: "https://cashfundher.com/callback",
      scope: ["r_emailaddress", "r_liteprofile"],
    },
    socialSignup
  )
);

// GOOGLE LOGIN
passport.use(
  new GoogleStrategy({
      clientID: googleClientID,
      clientSecret: googleClientSecret,
      callbackURL: "https://cashfundher.com/auth/google/callback",
      passReqToCallback: true,
    },
    socialSignup
  )
);

const socialLogin = async (req, res) => {
  try {
    const data = req.body;
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        responseCode: 422,
        message: "Validation error!",
        error: errors.array(),
        success: false,
      });
    }

    if (!data.accessToken) {
      return res.status(401).json({
        responseCode: 401,
        message: "Unauthorized! Please provide valid authorization token",
        success: false, // token not found
      });
    }

    const userRec = await User.findOne({
      where: {
        email: data.email
      },
    });

    if (userRec) {
      if (!userRec.isActive) {
        return res.status(401).json({
          responseCode: 401,
          message: "Your account has been suspended! Please contact admin.",
          success: false,
        });
      }

      const token = jwt.sign({
        id: userRec.id,
        randomKey: salt
      }, secret, {
        expiresIn: 86400,
      });

      return res.status(200).json({
        responseCode: 200,
        token: token,
        data: userRec,
        message: "Successfully Login",
        success: true,
      });
    }
    var avatar = `https://graph.facebook.com/${data.id}/picture?type=large`;
    var profileslug = data.name.replace(/\s+/g, "-").toLowerCase();

    let slugCheck = "";
    let slugCheckProfile = "";
    slugCheckProfile = await Project.findAndCountAll({
      where: {
        url: profileslug,
        is_deleted: {
          [Op.ne]: true,
        },
      },
    });
    slugCheck = await User.findAndCountAll({
      where: {
        profileUrl: profileslug,
        is_deleted: {
          [Op.ne]: true,
        },
      },
    });
    let slug = "";
    if (slugCheck.count > 0 || slugCheckProfile > 0) {
      profileslug += "-";
      slug = await generateprofileUrl(profileslug.toLowerCase());
    } else {
      slug = profileslug.toLowerCase();
    }
    const planId = await createPlan(
      `Donation for ${data.name}`,
      `Donation for ${data.name}`
    );

    await User.build({
        first_name: data.name ? data.name.split(" ")[0] : "",
        last_name: data.name && data.name.split(" ").length > 0 ?
          data.name.split(" ")[1] :
          "",
        email: data.email,
        password: "",
        street: "",
        city: "",
        state: "",
        zip: "",
        phone: "",
        personal_website: "",
        facebook: "",
        twitter: "",
        bio: "",
        is_receive_news: 0,
        avatar: avatar,
        is_social: 1,
        forget_token: "",
        is_verified: 0,
        is_acc_updated: 0,
        last_login: new Date(),
        profileUrl: slug,
        isActive: 1,
        anonymousUser: 0,
        plan_id: planId,
      })
      .save()
      .then((userRes) => {
        if (userRes.dataValues && userRes.dataValues.id) {
          const token = jwt.sign({
              id: userRes.dataValues.id,
              randomKey: salt
            },
            secret, {
              expiresIn: 86400,
            }
          );

          // CREATE STRIPE ACCOUNT FOR NEW USER
          //stripeCustomerCreate(userRes.dataValues, token, res);

          return res.status(200).json({
            responseCode: 200,
            token: token,
            data: userRes.dataValues,
            message: "User signup successfully",
            success: true,
          });
        }
      })
      .catch((err) => {});
  } catch (error) {
    return res.status(400).json({
      responseCode: 400,
      message: "Error while signup user through social login!",
      error: error,
      success: false,
    });
  }
};

/* CREATED BY: RISHABH BULA,
  DATED: 06/02/2019
*/
// USER FORGOT PASSWORD API
const userForgotPassword = async (req, res) => {
  const {
    body
  } = req;
  const {
    email
  } = body;
  try {
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        responseCode: 422,
        message: "Validation error!",
        error: errors.array(),
        success: false,
      });
    }

    const userData = await User.findOne({
      where: {
        email: email,
      },
    });
    if (!userData) {
      return res.status(400).json({
        message: "We are sorry your email is not registered with us, however you may start a new account by clicking join",
      });
    }
    // VERIFICATION TOKEN
    const verifingUser = jwt.sign({
        email: userData.dataValues.email,
        randomKey: salt
      },
      secret, {
        expiresIn: 86400,
      }
    );
    await User.update({
      forget_token: verifingUser,
    }, {
      where: {
        email: email,
      },
    });
    const hashId = await bcrypt.hashSync(userData.dataValues.email, salt);

    // MAIL SENDER
    await new emailSender().sendMail(
      [userData.email],
      "Reset Password Request",
      "",
      "CashFundHer",
      "",
      "forgetPassword", {
        first_name: userData.first_name,
        last_name: userData.last_name,
        hashId,
        verifingUser,
        serverURL: config.serverURL,
      },
      true
    );
    return res.status(200).json({
      responseCode: 200,
      //SUCCESS
      message: `Password reset link have been sent to ${body.email}. Do check your spam and junk folders if it doesn't show up in your Inbox.`,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: "We are fetching some problem, try again after some time.",
      success: false,
    });
  }
};
// USER FORGOT PASSWORD API

// USER VERIFICATION API
const userVerification = async (req, res) => {
  const {
    body
  } = req;
  const {
    verifyLink,
    userLink
  } = body;
  try {
    const userData = await User.findOne({
      where: {
        forget_token: userLink, // TOKEN VERIFICATION
      },
    });
    if (!userData) {
      return res.status(400).send({
        responseCode: 400,
        auth: false,
        message: "Failed to authenticate token.",
      });
    }
    const tokenMatch = await bcrypt.compareSync(
      userData.dataValues.email,
      verifyLink
    );
    if (!tokenMatch) {
      return res
        .status(400) // ERROR
        .send({
          responseCode: 400,
          auth: false,
          message: "Unauthorized link"
        });
    }
    return res.status(200).json({
      responseCode: 200, //SUCCESS
      message: "User Verified Successfully.",
      userEmail: userData.dataValues.email,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: "We are fetching some problem, try again after some time.",
      success: false,
    });
  }
};
// USER VERIFICATION API

// USER RESET PASSWORD API
const userResetPassword = async (req, res) => {
  const {
    body
  } = req;
  const {
    newPassword,
    email
  } = body;
  try {
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        responseCode: 422,
        message: "Validation error!",
        error: errors.array(),
        success: false,
      });
    }

    const userData = await User.findOne({
      where: {
        email: email,
      },
    });
    if (!userData) {
      return res.status(400).json({
        responseCode: 400,
        message: "User Not Found.",
        success: false,
      });
    }
    const hashNewPassword = await bcrypt.hashSync(newPassword, salt);
    await User.update({
      password: hashNewPassword,
      forget_token: null,
    }, {
      where: {
        email: email,
      },
    });
    return res.status(200).json({
      responseCode: 200,
      message: "Password Updated Successfully.", //SUCCESS
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: "We are fetching some problem, try again after some time.",
      success: false,
    });
  }
};
// USER RESET PASSWORD API
/* CREATED BY: RISHABH BULA,
  DATED: 06/02/2019
*/

const recurringDonars = async (req, res) => {
  const data = req.query;
  try {
    if (!data.userId) {
      return res.status(400).json({
        responseCode: 400,
        message: "User Id Not Found",
        success: false,
      });
    }
    const result = [];
    const activeDonars = await RecurringDonars.findAll({
      where: {
        user_id: data.userId,
        // is_recurring: 1
      },
      include: [{
        model: Project,
        attributes: ["name", "url"],
      }, ],
      order: [
        ["createdAt", "DESC"]
      ],
      // raw: true
    });
    let profileInfo = [];
    for (let index = 0; index < activeDonars.length; index++) {
      let element = activeDonars[index];
      if (element.direct_donation) {
        profileInfo = await User.findOne({
          where: {
            id: element.profile_id,
          },
          attributes: ["first_name", "last_name", "profileUrl"],
          raw: true,
        });
        // element.profileInfo = profileInfo;
        result.push({
          element,
          profileInfo
        });
      } else {
        result.push(element);
      }
    }

    if (!result) {
      return res.status(400).json({
        responseCode: 400,
        message: "Recurring data not found",
        success: false,
      });
    }
    return res.status(200).json({
      responseCode: 200,
      data: result,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: "We are fetching some problem, try again after some time.",
      success: false,
    });
  }
};

const recurringDonarsRecieve = async (req, res) => {
  const data = req.query;
  try {
    if (!data.userId) {
      return res.status(400).json({
        responseCode: 400,
        message: "User Id Not Found",
        success: false,
      });
    }
    const result = [];

    const userProjects = await Project.findAll({
      where: {
        userId: data.userId,
      },
    });

    let projectsArray = [];
    if (userProjects.length > 0) {
      for (let i = 0; userProjects.length > i; i++) {
        projectsArray.push(userProjects[i].dataValues.id);
      }
    }

    const activeDonars = await RecurringDonars.findAll({
      where: {
        project_id: projectsArray,
        is_recurring: 1,
      },
      include: [{
          model: Project,
          attributes: ["name", "url"],
        },
        {
          model: User,
          attributes: ["first_name", "last_name", "anonymousUser"],
        },
      ],
      order: [
        ["createdAt", "DESC"]
      ],
      // raw: true
    });

    const activeDonarsProfile = await RecurringDonars.findAll({
      where: {
        profile_id: data.userId,
        is_recurring: 1,
      },
      include: [{
          model: Project,
          attributes: ["name", "url"],
        },
        {
          model: User,
          attributes: ["first_name", "last_name", "anonymousUser"],
        },
      ],
      order: [
        ["createdAt", "DESC"]
      ],
      // raw: true
    });
    let completeData = [];
    completeData = activeDonars.concat(activeDonarsProfile);

    if (!result) {
      return res.status(400).json({
        responseCode: 400,
        message: "Recurring data not found",
        success: false,
      });
    }
    return res.status(200).json({
      responseCode: 200,
      data: completeData,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: "We are fetching some problem, try again after some time.",
      success: false,
    });
  }
};

// GET DONATION BY USERID
/* CREATED BY: RISHABH BULA,
   CREATED AT: 14/02/2019
   UPDATED BY: RISHABH BULA,
   UPDATED AT: 15/02/2019
*/
const sentDonationTransactionsOneTime = async (req, res) => {
  const {
    query
  } = req;
  let {
    page,
    limit,
    userId,
    startDate,
    endDate,
    donationOn,
    status,
  } = query;

  try {
    let condition = {
      payment_status: "Completed",
      is_recurring: 0,
      user_id: userId,
    };

    if (parseInt(donationOn) === 1) {
      condition = {
        ...condition,
        direct_donation: 1,
      };
    }
    if (parseInt(donationOn) === 0) {
      condition = {
        ...condition,
        direct_donation: {
          [Op.eq]: null,
        },
      };
    }
    if (startDate && endDate) {
      startDate = `${startDate} 00:00:00`;
      endDate = `${endDate} 23:59:00`;
      const startedDate = new Date(startDate);
      const EndDate = new Date(endDate);
      condition = {
        ...condition,
        [Op.and]: [{
            createdAt: {
              [Op.gte]: startedDate,
            },
          },
          {
            createdAt: {
              [Op.lte]: EndDate,
            },
          },
        ],
      };
    }
    if (status && status !== "all") {
      if (status === "Failed") {
        condition = {
          ...condition,
          status: 0,
        };
      } else {
        condition = {
          ...condition,
          payment_status: status,
        };
      }
    }
    const errors = await validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({
        responseCode: 422,
        message: "Validation error!",
        error: errors.array(),
        success: false,
      });
    }

    // page number is required
    if (!page || parseInt(page) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: "Page not provided or incorrect",
        success: false,
      });
    }

    // limit is required
    if (!limit || parseInt(limit) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: "Limit not provided or incorrect",
        success: false,
      });
    }

    let pageLimit = parseInt(limit); // data limit
    let offset = limit * (page - 1); // skip value

    if (!userId) {
      return res.status(400).json({
        responseCode: 400,
        message: "User Id Not Found",
        success: false,
      });
    }
    let includeTable = [];
    if (donationOn && donationOn !== "all") {
      // this for project donation
      if (parseInt(donationOn) === 0) {
        includeTable = [{
          model: Project,
          attributes: ["name", "id", "url", "reward"],
        }, ];
      }
      // this for profile donation
      else if (parseInt(donationOn) === 1) {
        includeTable = [{
          model: User,
          attributes: ["first_name", "last_name"],
        }, ];
      }
    } else {
      includeTable = [{
          model: Project,
          attributes: ["name", "id", "url", "reward"],
        },
        {
          model: User,
          attributes: ["first_name", "last_name"],
        },
      ];
    }
    let receivedData = [];
    if (donationOn && donationOn !== "all") {
      if (parseInt(donationOn) === 0) {
        receivedData = await Project.findAll({
          where: {
            userId: userId,
          },
        });
      }
    } else {
      receivedData = await Project.findAll({
        where: {
          userId: userId,
        },
      });
    }
    let element = [];
    for (let index = 0; index < receivedData.length; index++) {
      element = [...element, receivedData[index].dataValues.id];
    }
    let result = [];

    const sentTrans = await Finance.findAndCountAll({
      offset: offset,
      limit: pageLimit,
      where: condition,
      include: includeTable,
      order: [
        ["createdAt", "DESC"]
      ],
      // raw: true
    });

    let profileInfo = [];
    for (let index = 0; index < sentTrans.rows.length; index++) {
      let element = sentTrans.rows[index].dataValues;
      if (donationOn && donationOn !== "all") {
        //project donation
        if (parseInt(donationOn) === 0) {
          result.push(element);
        }
        //profile donation
        else if (parseInt(donationOn) === 1) {
          profileInfo = await User.findOne({
            where: {
              id: element.profile_id,
            },
            attributes: ["first_name", "last_name", "profileUrl"],
            raw: true,
          });
          result.push({
            element,
            profileInfo
          });
        }
      } else {
        if (element.direct_donation) {
          profileInfo = await User.findOne({
            where: {
              id: element.profile_id,
            },
            attributes: ["first_name", "last_name", "profileUrl"],
            raw: true,
          });
          result.push({
            element,
            profileInfo
          });
        } else {
          result.push(element);
        }
      }
    }
    const totalAmount = await Finance.findAll({
      where: condition,
      raw: true,
      attributes: [
        [Sequelize.fn("sum", Sequelize.col("amount")), "total_amount"],
      ],
    });
    let pages;
    pages = Math.ceil(parseInt(sentTrans.count) / limit);
    if (!result) {
      return res.status(400).json({
        responseCode: 400,
        message: "Donation data not found",
        success: false,
      });
    }
    return res.status(200).json({
      responseCode: 200,
      data: {
        rows: result,
        count: sentTrans.count
      },
      totalPages: pages,
      totalSentAmount: totalAmount && totalAmount.length ? totalAmount[0].total_amount : 0,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: "We are fetching some problem, try again after some time.",
      success: false,
    });
  }
};

//sent Donation Transactions Monthly
const sentDonationTransactionsMonthly = async (req, res) => {
  const {
    query
  } = req;
  let {
    page,
    limit,
    userId,
    startDate,
    endDate,
    donationOn,
    projectId,
    status,
  } = query;
  try {
    let condition = {
      payment_status: "Completed",
      is_recurring: 1,
      user_id: userId,
    };
    if (donationOn && donationOn !== "all") {
      if (parseInt(donationOn) === 1) {
        condition = {
          ...condition,
          direct_donation: 1,
        };
      }
      if (parseInt(donationOn) === 0) {
        condition = {
          ...condition,
          direct_donation: {
            [Op.eq]: null,
          },
        };
      }
    }
    if (startDate && endDate) {
      startDate = `${startDate} 00:00:00`;
      endDate = `${endDate} 23:59:00`;
      const startedDate = new Date(startDate);
      const EndDate = new Date(endDate);
      condition = {
        ...condition,
        [Op.and]: [{
            createdAt: {
              [Op.gte]: startedDate,
            },
          },
          {
            createdAt: {
              [Op.lte]: EndDate,
            },
          },
        ],
      };
    }
    if (status && status !== "all") {
      if (status === "Failed") {
        condition = {
          ...condition,
          status: 0,
        };
      } else {
        condition = {
          ...condition,
          payment_status: status,
        };
      }
    }
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        responseCode: 422,
        message: "Validation error!",
        error: errors.array(),
        success: false,
      });
    }
    // page number is required
    if (!page || parseInt(page) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: "Page not provided or incorrect",
        success: false,
      });
    }

    // limit is required
    if (!limit || parseInt(limit) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: "Limit not provided or incorrect",
        success: false,
      });
    }

    let pageLimit = parseInt(limit); // data limit
    let pageNumber = parseInt(page); // page number
    let offset = limit * (page - 1); // skip value

    if (!userId) {
      return res.status(400).json({
        responseCode: 400,
        message: "User Id Not Found",
        success: false,
      });
    }
    let includeTable = [];
    if (donationOn && donationOn !== "all") {
      // this for project donation
      if (parseInt(donationOn) === 0) {
        includeTable = [{
          model: Project,
          attributes: ["name", "id", "url", "reward"],
        }, ];
      }
      // this for profile donation
      else if (parseInt(donationOn) === 1) {
        includeTable = [{
          model: User,
          attributes: ["first_name", "last_name"],
        }, ];
      }
    } else {
      includeTable = [{
          model: Project,
          attributes: ["name", "id", "url", "reward"],
        },
        {
          model: User,
          attributes: ["first_name", "last_name"],
        },
      ];
    }
    let result = [];
    let receivedData = [];
    if (donationOn && donationOn !== "all") {
      if (parseInt(donationOn) === 0) {
        receivedData = await Project.findAll({
          where: {
            userId: userId,
          },
        });
      }
    } else {
      receivedData = await Project.findAll({
        where: {
          userId: userId,
        },
      });
    }
    let element = [];
    for (let index = 0; index < receivedData.length; index++) {
      element = [...element, receivedData[index].dataValues.id];
    }

    const sentTrans = await Finance.findAndCountAll({
      offset: offset,
      limit: pageLimit,
      where: condition,
      include: includeTable,
      order: [
        ["createdAt", "DESC"]
      ],
      // raw: true
    });
    let profileInfo = [];
    for (let index = 0; index < sentTrans.rows.length; index++) {
      let element = sentTrans.rows[index].dataValues;
      if (donationOn && donationOn !== "all") {
        //project donation
        if (parseInt(donationOn) === 0) {
          result.push(element);
        }
        //profile donation
        else if (parseInt(donationOn) === 1) {
          profileInfo = await User.findOne({
            where: {
              id: element.profile_id,
            },
            attributes: ["first_name", "last_name", "profileUrl"],
            raw: true,
          });
          result.push({
            element,
            profileInfo
          });
        }
      } else {
        if (element.direct_donation) {
          profileInfo = await User.findOne({
            where: {
              id: element.profile_id,
            },
            attributes: ["first_name", "last_name", "profileUrl"],
            raw: true,
          });
          result.push({
            element,
            profileInfo
          });
        } else {
          result.push(element);
        }
      }
    }
    const totalAmount = await Finance.findAll({
      where: condition,
      raw: true,
      attributes: [
        [Sequelize.fn("sum", Sequelize.col("amount")), "total_amount"],
      ],
    });
    const activeDonors = await RecurringDonars.findAll({
      where: {
        user_id: userId,
      },
      include: [{
        model: Project,
        attributes: ["name", "url"],
      }, ],
      order: [
        ["createdAt", "DESC"]
      ],
    });
    const nextMonthEstimation = await RecurringDonars.findAll({
      where: {
        user_id: userId,
        is_recurring: 1,
        where: Sequelize.where(
          Sequelize.fn(
            "datediff",
            Sequelize.col("next_donation_date"),
            Sequelize.fn("NOW")
          ), {
            [Op.gte]: 0,
          }
        ),
      },
      attributes: [
        [Sequelize.fn("sum", Sequelize.col("amount")), "total_amount"],
      ],
      // order: [['createdAt', 'DESC']],
    });
    let pages;
    pages = Math.ceil(parseInt(sentTrans.count) / limit);
    if (!result) {
      return res.status(400).json({
        responseCode: 400,
        message: "Donation data not found",
        success: false,
      });
    }
    return res.status(200).json({
      responseCode: 200,
      data: {
        rows: result,
        count: sentTrans.count,
        activeDonors: activeDonors,
        nextMonthEstimation: nextMonthEstimation && nextMonthEstimation.length ?
          nextMonthEstimation[0] :
          null,
        totalSentAmount: totalAmount && totalAmount.length ? totalAmount[0].total_amount : 0,
      },
      totalPages: pages,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: "We are fetching some problem, try again after some time.",
      success: false,
    });
  }
};

//sent project Donation Transaction
const sentProjectDonationTransactions = async (req, res) => {
  const {
    query
  } = req;
  const {
    page,
    limit,
    userId
  } = query;
  try {
    // page number is required
    if (!page || parseInt(page) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: "Page not provided or incorrect",
        success: false,
      });
    }

    // limit is required
    if (!limit || parseInt(limit) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: "Limit not provided or incorrect",
        success: false,
      });
    }

    let pageLimit = parseInt(limit); // data limit
    let pageNumber = parseInt(page); // page number
    let offset = limit * (page - 1); // skip value

    if (!userId) {
      return res.status(400).json({
        responseCode: 400,
        message: "User Id Not Found",
        success: false,
      });
    }

    // const receivedData = await Project.findAll({
    //   where: {
    //     userId: userId
    //   }
    // });
    const activeDonars = await RecurringDonars.findAll({
      where: {
        user_id: userId,
        //  is_recurring: 1,
        direct_donation: null,
      },
      attributes: [
        "project_id",
        "id",
        "amount",
        "next_donation_date",
        "is_recurring",
        "direct_donation",
        "subscription_id",
        "subscribed_by",
      ],
      include: [{
        model: Project,
        attributes: ["name", "url"],
      }, ],
      order: [
        ["createdAt", "DESC"]
      ],
      // raw: true
    });
    let result = [];
    const sentTrans = await Finance.findAndCountAll({
      offset: offset,
      limit: pageLimit,
      where: {
        // project_id: {
        //   [Op.notIn]: {
        //     [Op.in]: element
        //   }
        // },
        user_id: userId,
        payment_status: "Completed",
        direct_donation: null,
        // is_recurring: 0
      },
      include: [{
          model: Project,
          attributes: ["name", "id", "url", "userId"],
        },
        {
          model: User,
          attributes: ["first_name", "last_name"],
        },
      ],
      order: [
        ["createdAt", "DESC"]
      ],
      // raw: true
    });

    // let profileInfo = [];
    let count = 0;
    // for (let index = 0; index < sentTrans.rows.length; index++) {
    //   let element = sentTrans.rows[index].dataValues;
    //   if (!element.direct_donation) {
    //     count = count + 1
    //     result.push(element)
    //   }

    // }
    let pages;
    pages = Math.ceil(parseInt(sentTrans.count) / limit);
    if (!result) {
      return res.status(400).json({
        responseCode: 400,
        message: "Donation data not found",
        success: false,
      });
    }
    return res.status(200).json({
      responseCode: 200,
      data: {
        rows: sentTrans.rows,
        count: sentTrans.count,
        activeDonars: activeDonars,
      },
      totalPages: pages,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: "We are fetching some problem, try again after some time.",
      success: false,
    });
  }
};

//send profile donation transcation
const sentProfileDonationTransactions = async (req, res) => {
  const {
    query
  } = req;
  const {
    page,
    limit,
    userId
  } = query;
  try {
    // page number is required
    if (!page || parseInt(page) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: "Page not provided or incorrect",
        success: false,
      });
    }

    // limit is required
    if (!limit || parseInt(limit) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: "Limit not provided or incorrect",
        success: false,
      });
    }

    const pageLimit = parseInt(limit); // data limit
    const offset = limit * (page - 1); // skip value

    if (!userId) {
      return res.status(400).json({
        responseCode: 400,
        message: "User Id Not Found",
        success: false,
      });
    }

    const activeDonars = await RecurringDonars.findAll({
      where: {
        user_id: userId,
        direct_donation: 1,
      },
      attributes: [
        "profile_id",
        "id",
        "amount",
        "next_donation_date",
        "is_recurring",
        "direct_donation",
        "subscription_id",
        "subscribed_by",
      ],
      include: [{
        model: Project,
        attributes: ["name", "url"],
      }, ],
      order: [
        ["createdAt", "DESC"]
      ],
    });
    let result = [];
    const sentTrans = await Finance.findAndCountAll({
      offset: offset,
      limit: pageLimit,
      where: {
        user_id: userId,
        payment_status: "Completed",
        direct_donation: 1,
      },
      include: [{
          model: Project,
          attributes: ["name", "id", "url"],
        },
        {
          model: User,
          attributes: ["first_name", "last_name"],
        },
      ],
      order: [
        ["createdAt", "DESC"]
      ],
    });

    let profileInfo = [];
    let transCount = 0;

    for (let index = 0; index < sentTrans.rows.length; index++) {
      let element = sentTrans.rows[index].dataValues;
      if (element.direct_donation) {
        transCount = transCount + 1;
        profileInfo = await User.findOne({
          where: {
            id: element.profile_id,
          },
          attributes: ["first_name", "last_name", "profileUrl", "id"],
          raw: true,
        });
        result.push({
          element,
          profileInfo
        });
      }
    }
    let pages;
    pages = Math.ceil(parseInt(sentTrans.count) / limit);
    if (!result) {
      return res.status(400).json({
        responseCode: 400,
        message: "Donation data not found",
        success: false,
      });
    }
    return res.status(200).json({
      responseCode: 200,
      data: {
        rows: result,
        count: sentTrans,
        activeDonars: activeDonars
      },
      totalPages: pages,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: "We are fetching some problem, try again after some time.",
      success: false,
    });
  }
};
//receive project donation data
const receiveProjectDonationTransactions = async (req, res) => {
  const {
    query
  } = req;
  const {
    page,
    limit,
    userId
  } = query;
  try {
    // page number is required
    if (!page || parseInt(page) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: "Page not provided or incorrect",
        success: false,
      });
    }
    // limit is required
    if (!limit || parseInt(limit) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: "Limit not provided or incorrect",
        success: false,
      });
    }

    const pageLimit = parseInt(limit); // data limit
    const offset = limit * (page - 1); // skip value

    if (!userId) {
      return res.status(400).json({
        responseCode: 400,
        message: "User Id Not Found",
        success: false,
      });
    }

    const receivedData = await Project.findAll({
      where: {
        userId: userId,
      },
    });
    const projectsIds = receivedData.map(item => item.dataValues.id);

    const receivedTrans = await Finance.findAndCountAll({
      offset: offset,
      limit: pageLimit,
      where: {
        project_id: {
          [Op.in]: projectsIds,
        },
        //user_id: { [Op.ne]: userId },
        // is_recurring: 0,
        direct_donation: null,
        payment_status: "Completed",
      },
      include: [{
          model: Project,
          attributes: ["name", "id", "url"],
        },
        {
          model: User,
          attributes: ["first_name", "last_name", "anonymousUser"],
        },
      ],
      order: [
        ["createdAt", "DESC"]
      ],
      //raw: true
    });
    //total estimated payout amount
    const totalAmount = await Finance.findAll({
      where: {
        project_id: {
          [Op.in]: projectsIds,
        },
        is_recurring: 1,
        direct_donation: null,
        payment_status: "Completed",
        where: Sequelize.where(
          Sequelize.fn(
            "datediff",
            Sequelize.col("next_donation_date"),
            Sequelize.fn("NOW")
          ), {
            [Op.gt]: 0, // OR [Op.gt] : 5
          }
        ),
      },
      attributes: [
        [Sequelize.fn("sum", Sequelize.col("payout_amount")), "total_amount"],
      ],
    });
    let pages;
    pages = Math.ceil(parseInt(receivedTrans.count) / limit);
    if (!receivedTrans) {
      return res.status(400).json({
        responseCode: 400,
        message: "Donation data not found",
        success: false,
      });
    }
    return res.status(200).json({
      responseCode: 200,
      data: receivedTrans,
      totalPages: pages,
      totalAmount: totalAmount,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: "We are fetching some problem, try again after some time.",
      success: false,
    });
  }
};

//receive project donation data
const receiveProfileDonationTransactions = async (req, res) => {
  const {
    query
  } = req;
  const {
    page,
    limit,
    userId
  } = query;
  try {
    // page number is required
    if (!page || parseInt(page) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: "Page not provided or incorrect",
        success: false,
      });
    }

    // limit is required
    if (!limit || parseInt(limit) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: "Limit not provided or incorrect",
        success: false,
      });
    }

    const pageLimit = parseInt(limit); // data limit
    const offset = limit * (page - 1); // skip value

    if (!userId) {
      return res.status(400).json({
        responseCode: 400,
        message: "User Id Not Found",
        success: false,
      });
    }

    const receivedTrans = await Finance.findAndCountAll({
      offset: offset,
      limit: pageLimit,
      where: {
        profile_id: userId,
        direct_donation: 1,
        //user_id: { [Op.ne]: userId },
        // is_recurring: 0,
        payment_status: "Completed",
      },
      include: [{
          model: Project,
          attributes: ["name", "id", "url"],
        },
        {
          model: User,
          attributes: ["first_name", "last_name", "anonymousUser"],
        },
      ],
      order: [
        ["createdAt", "DESC"]
      ],
    });
    //total estimated payout amount
    const totalAmount = await Finance.findAll({
      where: {
        profile_id: userId,
        is_recurring: 1,
        direct_donation: 1,
        payment_status: "Completed",
        where: Sequelize.where(
          Sequelize.fn(
            "datediff",
            Sequelize.col("next_donation_date"),
            Sequelize.fn("NOW")
          ), {
            [Op.gt]: 0,
          }
        ),
      },
      attributes: [
        [Sequelize.fn("sum", Sequelize.col("payout_amount")), "total_amount"],
      ],
    });
    const totalPages = Math.ceil(parseInt(receivedTrans.count) / limit);

    if (!receivedTrans) {
      return res.status(400).json({
        responseCode: 400,
        message: "Donation data not found",
        success: false,
      });
    }
    return res.status(200).json({
      responseCode: 200,
      data: receivedTrans,
      totalAmount: totalAmount,
      totalPages,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: "We are fetching some problem, try again after some time.",
      success: false,
    });
  }
};

// ________________________________
// receive Donation Transactions OneTime
const receiveDonationTransactionsOneTime = async (req, res) => {
  const {
    query
  } = req;
  let {
    page,
    limit,
    userId,
    startDate,
    endDate,
    donationOn,
    projectId,
    status,
  } = query;
  try {
    let condition = {
      is_recurring: 0,
      payment_status: "Completed",
    };

    if (startDate && endDate) {
      startDate = `${startDate} 00:00:00`;
      endDate = `${endDate} 23:59:00`;
      const startedDate = new Date(startDate);
      const EndDate = new Date(endDate);
      condition = {
        ...condition,
        [Op.and]: [{
            createdAt: {
              [Op.gte]: startedDate,
            },
          },
          {
            createdAt: {
              [Op.lte]: EndDate,
            },
          },
        ],
      };
    }
    if (status && status !== "all") {
      condition = {
        ...condition,
        payout_succeed: status === "Completed" ? 1 : 0,
      };
    }
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        responseCode: 422,
        message: "Validation error!",
        error: errors.array(),
        success: false,
      });
    }
    // page number is required
    if (!page || parseInt(page) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: "Page not provided or incorrect",
        success: false,
      });
    }

    // limit is required
    if (!limit || parseInt(limit) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: "Limit not provided or incorrect",
        success: false,
      });
    }

    let pageLimit = parseInt(limit); // data limit
    let pageNumber = parseInt(page); // page number
    let offset = limit * (pageNumber - 1); // skip value

    if (!userId) {
      return res.status(400).json({
        responseCode: 400,
        message: "User Id Not Found",
        success: false,
      });
    }

    const receivedData = await Project.findAll({
      where: {
        userId: userId,
      },
    });
    const projectsIds = receivedData.map(item => item.dataValues.id);

    if (donationOn || projectId) {
      if (donationOn) {
        condition = {
          ...condition,
          profile_id: userId,
        };
      }
      if (projectId) {
        condition = {
          ...condition,
          project_id: projectId,
        };
      }
    } else {
      condition = {
        ...condition,
        [Op.or]: [{
            project_id: {
              [Op.in]: projectsIds,
            },
          },
          {
            profile_id: userId,
          },
        ],
      };
    }
    const receivedTrans = await Finance.findAndCountAll({
      offset: offset,
      limit: pageLimit,
      where: condition,
      include: [{
          model: Project,
          attributes: ["name", "id", "url", "reward"],
        },
        {
          model: User,
          attributes: ["first_name", "last_name", "anonymousUser"],
        },
      ],
      order: [
        ["createdAt", "DESC"]
      ],
      //raw: true
    });
    let pages;
    pages = Math.ceil(parseInt(receivedTrans.count) / limit);
    const totalAmount = await Finance.findAll({
      where: condition,
      raw: true,
      attributes: [
        [Sequelize.fn("sum", Sequelize.col("payout_amount")), "total_amount"],
      ],
    });
    if (!receivedTrans) {
      return res.status(400).json({
        responseCode: 400,
        message: "Donation data not found",
        success: false,
      });
    }

    return res.status(200).json({
      responseCode: 200,
      data: receivedTrans,
      totalPages: pages,
      totalReceivedAmount: totalAmount && totalAmount.length ? totalAmount[0].total_amount : 0,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: "We are fetching some problem, try again after some time.",
      success: false,
    });
  }
};

// ________________________________
// receive Donation Transactions OneTime
const receiveDonationTransactionsMonthly = async (req, res) => {
  const {
    query
  } = req;
  let {
    page,
    limit,
    userId,
    startDate,
    endDate,
    donationOn,
    projectId,
    status,
  } = query;
  try {
    let condition = {
      is_recurring: 1,
      payment_status: "Completed",
    };
    if (startDate && endDate) {
      startDate = `${startDate} 00:00:00`;
      endDate = `${endDate} 23:59:00`;
      const startedDate = new Date(startDate);
      const EndDate = new Date(endDate);
      condition = {
        ...condition,
        [Op.and]: [{
            createdAt: {
              [Op.gte]: startedDate,
            },
          },
          {
            createdAt: {
              [Op.lte]: EndDate,
            },
          },
        ],
      };
    }
    if (status && status !== "all") {
      condition = {
        ...condition,
        payout_succeed: status === "Completed" ? 1 : 0,
      };
    }
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        responseCode: 422,
        message: "Validation error!",
        error: errors.array(),
        success: false,
      });
    }
    // page number is required
    if (!page || parseInt(page) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: "Page not provided or incorrect",
        success: false,
      });
    }

    // limit is required
    if (!limit || parseInt(limit) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: "Limit not provided or incorrect",
        success: false,
      });
    }

    let pageLimit = parseInt(limit); // data limit
    let pageNumber = parseInt(page); // page number
    let offset = limit * (pageNumber - 1); // skip value

    if (!userId) {
      return res.status(400).json({
        responseCode: 400,
        message: "User Id Not Found",
        success: false,
      });
    }

    const receivedData = await Project.findAll({
      where: {
        userId: userId,
      },
    });

    const projectsIds = receivedData.map(item => item.dataValues.id);

    if (donationOn || projectId) {
      if (donationOn) {
        condition = {
          ...condition,
          profile_id: userId,
        };
      }
      if (projectId) {
        condition = {
          ...condition,
          project_id: projectId,
        };
      }
    } else {
      condition = {
        ...condition,
        [Op.or]: [{
            project_id: {
              [Op.in]: projectsIds,
            },
          },
          {
            profile_id: userId,
          },
        ],
      };
    }
    const receivedTrans = await Finance.findAndCountAll({
      offset: offset,
      limit: pageLimit,
      where: condition,
      include: [{
          model: Project,
          attributes: ["name", "id", "url", "reward"],
        },
        {
          model: User,
          attributes: ["first_name", "last_name", "anonymousUser"],
        },
      ],
      order: [
        ["createdAt", "DESC"]
      ],
    });
    const totalAmount = await Finance.findAll({
      where: condition,
      raw: true,
      attributes: [
        [Sequelize.fn("sum", Sequelize.col("payout_amount")), "total_amount"],
      ],
    });

    let pages;
    pages = Math.ceil(parseInt(receivedTrans.count) / limit);
    const nextMonthEstimation = await RecurringDonars.findAll({
      where: {
        [Op.or]: [{
            project_id: {
              [Op.in]: projectsIds,
            },
          },
          {
            profile_id: userId,
          },
        ],
        is_recurring: 1,
        where: Sequelize.where(
          Sequelize.fn(
            "datediff",
            Sequelize.col("next_donation_date"),
            Sequelize.fn("NOW")
          ), {
            [Op.gte]: 0,
          }
        ),
      },
      attributes: [
        [Sequelize.fn("sum", Sequelize.col("amount")), "total_amount"],
        [Sequelize.fn("count", Sequelize.col("amount")), "total_donors"],
      ],
      raw: true,
    });
    if (!receivedTrans) {
      return res.status(400).json({
        responseCode: 400,
        message: "Donation data not found",
        success: false,
      });
    }
    return res.status(200).json({
      responseCode: 200,
      data: receivedTrans,
      totalPages: pages,
      nextMonthEstimation: nextMonthEstimation && nextMonthEstimation.length ?
        nextMonthEstimation[0] :
        null,
      totalReceivedAmount: totalAmount && totalAmount.length ? totalAmount[0].total_amount : 0,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: "We are fetching some problem, try again after some time.",
      success: false,
    });
  }
};

//Receive Transactions Monthly
const getDonationOfUser = async (req, res) => {
  const {
    query
  } = req;
  const {
    page,
    limit,
    userId
  } = query;
  try {
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        responseCode: 422,
        message: "Validation error!",
        error: errors.array(),
        success: false,
      });
    }
    // page number is required
    if (!page || parseInt(page) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: "Page not provided or incorrect",
        success: false,
      });
    }

    // limit is required
    if (!limit || parseInt(limit) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: "Limit not provided or incorrect",
        success: false,
      });
    }

    const pageLimit = parseInt(limit); // data limit
    const offset = limit * (page - 1); // skip value

    if (!userId) {
      return res.status(400).json({
        responseCode: 400,
        message: "User Id Not Found",
        success: false,
      });
    }

    //Received Transactions

    const donationData = await Finance.findAndCountAll({
      where: {
        user_id: userId,
        payment_status: "Completed",
      },
      include: [{
        model: Project,
        attributes: ["name"],
      }, ],
      order: [
        ["createdAt", "DESC"]
      ],
      limit: pageLimit,
      offset: offset,
    });

    let pages;
    pages = Math.ceil(parseInt(donationData.count) / limit);
    if (!donationData) {
      return res.status(400).json({
        responseCode: 400,
        message: "Donation data not found",
        success: false,
      });
    }
    return res.status(200).json({
      responseCode: 200,
      data: donationData,
      totalPages: pages,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: "We are fetching some problem, try again after some time.",
      success: false,
    });
  }
};
/* CREATED BY: RISHABH BULA,
   CREATED AT: 14/02/2019
   UPDATED BY: RISHABH BULA,
   UPDATED AT: 15/02/2019
*/
const userChangePassword = async (req, res) => {
  const {
    body
  } = req;
  const {
    oldPassword,
    newPassword,
    userId
  } = body;
  try {
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        responseCode: 422,
        message: "Validation error!",
        error: errors.array(),
        success: false,
      });
    }

    const userData = await User.findOne({
      where: {
        id: userId,
      },
    });
    if (!userData) {
      return res.status(400).json({
        responseCode: 400,
        message: "User Not Found",
        success: false,
      });
    }

    const passwordMatch = await bcrypt.compareSync(
      oldPassword,
      userData.dataValues.password
    );

    if (!passwordMatch) {
      return res.status(400).json({
        responseCode: 400,
        message: "Your old password is incorrect",
        success: false,
      });
    }
    const hashNewPassword = await bcrypt.hashSync(newPassword, salt);
    const result = await User.update({
      password: hashNewPassword,
    }, {
      where: {
        id: userId,
      },
    });
    return res.status(200).json({
      responseCode: 200,
      message: "Password Updated Successfully.",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: "We are fetching some problem, try again after some time.",
      success: false,
    });
  }
};
//FUNCTION TO UPLOAD USER PROFILE PIC
/* CREATED BY: RISHABH BULA,
   CREATED AT: 20/02/2019
   UPDATED BY: RISHABH BULA,
   UPDATED AT: 20/02/2019
*/
const userProfilePhoto = async (req, res) => {
  const {
    body
  } = req;
  const {
    file,
    userId
  } = body;
  try {
    if (!file) {
      return res.status(400).json({
        responseCode: 400,
        message: "Image not found for upload",
        success: false,
      });
    }
    if (!userId) {
      return res.status(400).json({
        responseCode: 400,
        message: "UserId not provided",
        success: false,
      });
    }
    const userData = await User.update({
      avatar: file,
    }, {
      where: {
        id: userId,
      },
    });
    if (userData) {
      return res.status(200).json({
        responseCode: 200,
        message: "Profile Image uploaded successfully",
        success: true,
      });
    } else {
      return res.status(400).json({
        responseCode: 400,
        message: "Failed to upload image!! try again",
        success: false,
      });
    }
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: "We are fetching some problem, try again after some time.",
      success: false,
    });
  }
};
//FUNCTION TO UPLOAD USER PROFILE PIC

const getDetailsByURL = async (req, res) => {
  try {
    const data = req.body;
    if (!data.url) {
      return res.status(404).json({
        responseCode: 404,
        message: "URL not provided!",
        success: false,
      });
    }
    
    var projectInfo = await Project.findOne({
      where: {
        url: data.url,
        is_deleted: {
          [Op.ne]: true,
        },
      },
      include: [{
        model: User,
        attributes: [
          "first_name",
          "last_name",
          "email",
          "is_verified",
          "is_acc_updated",
          "is_paypal_connected",
          "profileUrl",
        ],
      }, ],
    });

    if (projectInfo) {
      let projectData = projectInfo.dataValues;

      const [project_total_amount] = await sequelize.query(
        `SELECT count(id) count, sum(amount) total_amount, sum(website_amount) website_amount FROM finances WHERE project_id=${projectData.id} AND payment_status="Completed"`
      );

      const total_amount = project_total_amount[0].total_amount;
      const website_amount = project_total_amount[0].website_amount;
      
      projectData.total_contributors = project_total_amount[0].count;
      projectData.total_pledged = total_amount ? (total_amount - website_amount) : 0;
      projectData.percentage = total_amount ? (total_amount - website_amount)*100/projectData.amount : 0;

      return res.status(200).json({
        responseCode: 200,
        message: "Project info fetched successfully!",
        data: projectData,
        redirectTo: "project",
        // isVerified: doantionData.is_verified,
        success: true,
      });
    }

    var userInfo = await User.findOne({
      where: {
        profileUrl: data.url,
        is_deleted: {
          [Op.ne]: true,
        },
      },
    });
    if (userInfo) {
      let userData = userInfo.dataValues;
      const id = userData.id;
      let condition = {
        status: "live"
      };
      const projectData = await Project.findAll({
        where: {
          ...condition,
          userId: id,
          is_deleted: {
            [Op.ne]: true,
          },
        },
        order: [
          ["createdAt", "DESC"]
        ],
        attributes: [
          "id",
          "name",
          "url",
          "punch_line",
          "category",
          "amount",
          "deadline",
          "userId",
          "location",
          "status",
          "project_location",
          "percentage",
          "total_contributors",
          "total_pledged",
          "featured_image",
          "thumbnail_image",
          "createdAt",
          "updatedAt",
          "isFeatured",
        ],
        include: [{
          model: User,
          attributes: [
            "email",
            "is_verified",
            "is_acc_updated",
            "profileUrl",
            "is_paypal_connected",
          ],
        }, ],
      });

      const backedProjects = await Finance.findAll({
        where: {
          user_id: id,
          payment_status: "Completed",
        },
        include: [{
          model: Project,
          attributes: ["name"],
        }, ],
      });

      if (!projectData) {
        return res.status(200).json({
          message: " user data found but no project found",
          success: true,
          redirectTo: "profile",
          userData,
        });
      } else {
        return res.status(200).json({
          message: "user and project both found",
          success: true,
          redirectTo: "profile",
          userData,
          projectData,
          backedProjects,
        });
      }
    } else {
      return res.status(400).json({
        message: "URL doesn't belong to any Project nor User",
        success: false,
      });
    }
  } catch (error) {
    return res.status(400).json({
      responseCode: 400,
      message: "Error while fecthing info!",
      error: error,
      success: false,
    });
  }
};

//FUNCTION TO GET fEATURED USERS
const showFeaturedProfiles = async (req, res) => {
  const queryParams = req.query;
  const {
    isFeatured,
    isFeaturedSecond
  } = queryParams;

  const condition = {
    isActive: 1,
    anonymousUser: 0
  };
  // get user when isFeatured is true
  if (isFeaturedSecond) {
    condition.is_featured_second = {
      [Op.eq]: 1,
    };
  }
  
  if (isFeatured) {
    condition.isFeatured = {
      [Op.eq]: 1,
    };
  }

  if (isFeaturedSecond || isFeatured) {
    condition.is_deleted = {
      [Op.ne]: true,
    };
  }

  try {
    const featuredCount = await User.count({
      where: condition
    });
    let result = "";
    // if featured user is not more than 3
    if ((featuredCount > 3 && isFeatured) || isFeaturedSecond) {
      result = await User.findAll({
        where: condition,
        attributes: [
          "id",
          "avatar",
          "first_name",
          "last_name",
          "bio",
          "facebook",
          "instagram",
          "twitter",
          "youtube",
          "linkedin",
          "profileUrl",
        ],
      });
    } else {
      result = await User.findAll({
        limit: 10,
        offset: 0,
        order: [
          ["createdAt", "DESC"]
        ],
        where: {
          isActive: 1,
          anonymousUser: 0,
          is_deleted: {
            [Op.ne]: true,
          },
        },
        attributes: [
          "id",
          "avatar",
          "first_name",
          "last_name",
          "bio",
          "facebook",
          "instagram",
          "twitter",
          "youtube",
          "linkedin",
          "profileUrl",
        ],
      });
    }
    return res.status(200).json({
      responseCode: 200,
      message: "User profiles fetched successfully",
      data: result,
      success: true,
    });
  } catch (error) {
    return res.status(400).json({
      responseCode: 400,
      message: "Error while fetching users!",
      error: error,
      success: false,
    });
  }
};

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Function to create plan for existing user & projects
const addPlan = async (req, res) => {
  try {
    const users = await User.findAll({
      where: {
        anonymousUser: 0,
        plan_id: null,
      },
    });

    for (const user of users) {

      const planId = await createPlan(
        `Donation for ${user.first_name} ${user.last_name}`,
        `Donation for ${user.first_name} ${user.last_name}`
      );

      await User.update({
        plan_id: planId,
      }, {
        where: {
          id: user.id,
        },
      });
      await sleep(600);
    }
    const projects = await Project.findAll({
      where: {
        plan_id: {
          [Op.eq]: null
        },
      },
    });

    for (const project of projects) {
      const planId = await createPlan(
        `Donation for ${project.name}`,
        project.punch_line
      );

      await Project.update({
        plan_id: planId,
      }, {
        where: {
          id: project.id,
        },
      });
      await sleep(600);
    }
    return res.status(200).json({
      message: `user and project both plan added successfully ${users.length}`,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: "Error while adding info!",
      error: error,
      success: false,
    });
  }
};

// Function to create plan for existing user & projects
const addMemberstoMailchimpList = async (req, res) => {
  try {
    const userData = await User.findAll({
      where: {
        anonymousUser: 0,
      },
    });
    for (let index = 0; index < userData.length; index++) {
      const element = userData[index];
      const addMember = await addMemberToList(
        element.email,
        false,
        "",
        element.id
      );
      if (!addMember.isError) {
        await User.update({
          is_newsletter_subscribed: 1,
        }, {
          where: {
            id: element.id,
          },
        });
      }
    }
    return res.status(200).json({
      message: "user added to list succssfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: "Error while adding info!",
      error: error,
      success: false,
    });
  }
};

// Function to update existing accounts
const updateCapabilities = async (req, res) => {
  try {
    const donationData = await Donation.findAll();
    for (const element of donationData) {
      await stripe.accounts.update(
        element.account_id, {
          business_type: "individual",
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
        });
    }
    return res.status(200).json({
      message: "accounts updated successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: "Error while adding info!",
      error: error,
    });
  }
};
const donationCollected = async (req, res) => {
  const {
    query
  } = req;
  const {
    page,
    limit,
    userId
  } = query;
  const queryParams = query;
  const {
    donationOn,
    donationType,
    startDate = "",
    endDate = "",
    donationCollected,
  } = queryParams;
  // 0 for project filter
  //1 for profile filter

  try {
    // page number is required
    if (!page || parseInt(page) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: "Page not provided or incorrect",
        success: false,
      });
    }

    // limit is required
    if (!limit || parseInt(limit) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: "Limit not provided or incorrect",
        success: false,
      });
    }

    let pageLimit = parseInt(limit); // data limit
    let offset = limit * (page - 1); // skip value

    if (!userId) {
      return res.status(400).json({
        responseCode: 400,
        message: "User Id Not Found",
        success: false,
      });
    }

    const receivedData = await Project.findAll({
      where: {
        userId: userId,
      },
    });
    let element = [];
    for (let index = 0; index < receivedData.length; index++) {
      element = [...element, receivedData[index].dataValues.id];
    }
    let condition = "";
    condition += `Finances.payment_status='Completed'`;
    if (startDate) {
      condition += ` AND Date(Finances.createdAt) >='${startDate}'`;
    }
    if (endDate) {
      condition += ` AND Date(Finances.createdAt) <='${endDate}'`;
    }
    if (donationType) {
      condition += ` AND Finances.is_recurring ='${donationType}'`;
    }
    condition += ` AND (profile_id=${userId} OR project_id In(${element})) `;

    let projectCondition = `direct_donation Is Null AND project_id In(${element}) AND Finances.payment_status='Completed'`;
    if (donationType !== "") {
      projectCondition += ` AND Finances.is_recurring ='${donationType}'`;
    }
    if (startDate) {
      projectCondition += ` AND Date(Finances.createdAt) >='${startDate}'`;
    }
    if (endDate) {
      projectCondition += ` AND Date(Finances.createdAt)<='${endDate}'`;
    }

    let profileCondition = ` direct_donation =1 AND profile_id='${userId}' AND Finances.payment_status='Completed'`;
    if (donationType) {
      profileCondition += ` AND Finances.is_recurring ='${donationType}'`;
    }
    if (startDate) {
      profileCondition += ` AND Date(Finances.createdAt) >='${startDate}'`;
    }
    if (endDate) {
      profileCondition += ` AND Date(Finances.createdAt)<='${endDate}'`;
    }
    let resp = "";
    let count = "";

    let totalAmount = 0;
    if (donationCollected == "past") {
      //this for project donation & check this thing by direct_donation
      if (parseInt(donationOn) === 0) {
        resp = `SELECT Finances.id,Finances.user_id,Finances.full_name,Finances.email,Finances.is_recurring,Finances.checkout_id,Finances.donation_id,Finances.project_id,Finances.amount,Finances.status,Finances.profile_id,Finances.direct_donation,Finances.payout_succeed,Finances.payment_by,Finances.payment_status,Finances.next_donation_date,Finances.createdAt,Finances.updatedAt,Projects.name AS projectName,Projects.id,Projects.url AS projectUrl,Users.id,Users.first_name,Users.last_name,Users.anonymousUser,Users.profileUrl AS ProfileUrl FROM Finances LEFT OUTER JOIN Projects ON Finances.project_id = Projects.id LEFT OUTER JOIN Users ON Finances.user_id = Users.id WHERE ${projectCondition}  ORDER BY Finances.createdAt DESC LIMIT ${offset},${pageLimit}`;

        count = `SELECT count(id) As totalCount FROM Finances WHERE ${projectCondition} `;

        totalAmount = `SELECT sum(amount) As totalAmount FROM Finances WHERE ${projectCondition} `;
      }
      //this for profile donation
      else if (parseInt(donationOn) === 1) {
        resp = `SELECT Finances.id, user_id,full_name ,Finances.email , Finances.is_recurring, Finances.checkout_id, Finances.donation_id, Finances.project_id,Finances.amount, Finances.status, Finances.profile_id, Finances.direct_donation, Finances.payment_by, Finances.payment_status,Finances.next_donation_date,Finances.createdAt,Finances.updatedAt ,Finances.payout_succeed, Users.id, Users.first_name, Users.last_name , Users.anonymousUser,Users.profileUrl AS ProfileUrl FROM Finances  LEFT OUTER JOIN Users ON Finances.user_id = Users.id WHERE ${profileCondition} ORDER BY Finances.createdAt DESC LIMIT ${offset},${pageLimit}`;

        count = `SELECT count(id) As totalCount FROM Finances WHERE ${profileCondition}`;

        totalAmount = `SELECT sum(amount) As totalAmount FROM Finances WHERE ${profileCondition}`;
      }
      //this for both project and profile donation
      else {
        resp = `SELECT Finances.id, user_id,full_name ,Finances.email , Finances.is_recurring, Finances.checkout_id, Finances.donation_id, Finances.project_id,Finances.amount, Finances.payout_succeed,Finances.payment_by,Finances.status, Finances.profile_id, Finances.direct_donation, Finances.next_donation_date,Finances.createdAt,Finances.updatedAt ,Projects.name AS projectName, Projects.id , Projects.url AS projectUrl, Users.id, Users.first_name, Users.last_name ,Users.anonymousUser, Users.profileUrl AS ProfileUrl FROM Finances LEFT OUTER JOIN Projects ON Finances.project_id = Projects.id LEFT OUTER JOIN Users ON Finances.user_id = Users.id WHERE ${condition} ORDER BY Finances.createdAt DESC LIMIT ${offset},${pageLimit} `;
        count = `SELECT count(id) As totalCount FROM Finances WHERE ${condition} `;

        totalAmount = `SELECT sum(amount)  As totalAmount FROM Finances WHERE ${condition} `;
      }
    }
    //this for upcoming donation collected
    else if (donationCollected == "future") {
      //this for project donation
      if (parseInt(donationOn) === 0) {
        resp = `SELECT RecurringDonars.id ,RecurringDonars.user_id, RecurringDonars.next_donation_date, 
       RecurringDonars.is_recurring , RecurringDonars.project_id,RecurringDonars.amount, RecurringDonars.profile_id, RecurringDonars.direct_donation ,RecurringDonars.createdAt,Projects.name AS projectName, Projects.id , Projects.url AS projectUrl, Users.id, Users.first_name, Users.last_name , Users.anonymousUser,Users.profileUrl AS ProfileUrl FROM RecurringDonars LEFT OUTER JOIN Projects ON RecurringDonars.project_id = Projects.id LEFT OUTER JOIN Users ON RecurringDonars.user_id = Users.id WHERE  direct_donation Is Null AND RecurringDonars.is_recurring ='1'AND project_id In(${element}) AND Date(RecurringDonars.next_donation_date) >='${startDate}' AND Date(RecurringDonars.next_donation_date)<='${endDate}' ORDER BY RecurringDonars.next_donation_date DESC LIMIT ${offset},${pageLimit}`;

        count = `SELECT count(id) As totalCount FROM RecurringDonars WHERE  direct_donation Is Null AND is_recurring ='1'AND project_id In(${element}) AND Date(next_donation_date) >='${startDate}' AND Date(next_donation_date)<='${endDate}'`;

        totalAmount = `SELECT sum(amount)  As totalAmount FROM RecurringDonars WHERE  direct_donation Is Null AND is_recurring ='1'AND project_id In(${element}) AND Date(RecurringDonars.next_donation_date) >='${startDate}' AND Date(RecurringDonars.next_donation_date)<='${endDate}'`;
      }
      //this for profile donation
      else if (parseInt(donationOn) === 1) {
        resp = `SELECT RecurringDonars.id ,RecurringDonars.user_id, RecurringDonars.next_donation_date, 
       RecurringDonars.is_recurring , RecurringDonars.project_id,RecurringDonars.amount, RecurringDonars.profile_id, RecurringDonars.direct_donation,RecurringDonars.createdAt , Users.id, Users.first_name, Users.last_name , Users.anonymousUser,Users.profileUrl AS ProfileUrl FROM RecurringDonars  LEFT OUTER JOIN Users ON RecurringDonars.user_id = Users.id WHERE direct_donation ='${donationOn}' AND RecurringDonars.is_recurring ='1' AND profile_id ='${userId}' AND Date(RecurringDonars.next_donation_date) >='${startDate}' AND Date(RecurringDonars.next_donation_date)<='${endDate}' ORDER BY RecurringDonars.next_donation_date DESC LIMIT ${offset},${pageLimit}`;

        count = `SELECT count(id) As totalCount FROM RecurringDonars WHERE direct_donation ='${donationOn}' AND RecurringDonars.is_recurring ='1' AND profile_id ='${userId}' AND Date(RecurringDonars.next_donation_date) >='${startDate}' AND Date(RecurringDonars.next_donation_date)<='${endDate}'`;

        totalAmount = `SELECT sum(amount)  As totalAmount FROM RecurringDonars WHERE  direct_donation ='${donationOn}' AND RecurringDonars.is_recurring ='1' AND profile_id ='${userId}' AND Date(RecurringDonars.next_donation_date) >='${startDate}' AND Date(RecurringDonars.next_donation_date)<='${endDate}'`;
      }
      //this for both project and profile donation
      else {

        resp = `SELECT RecurringDonars.id ,RecurringDonars.user_id, RecurringDonars.next_donation_date, 
      RecurringDonars.is_recurring , RecurringDonars.project_id,RecurringDonars.amount, RecurringDonars.profile_id, RecurringDonars.direct_donation ,RecurringDonars.createdAt,Projects.name AS projectName, Projects.id , Projects.url AS projectUrl, Users.id, Users.first_name, Users.last_name ,Users.anonymousUser, Users.profileUrl AS ProfileUrl FROM RecurringDonars LEFT OUTER JOIN Projects ON RecurringDonars.project_id = Projects.id LEFT OUTER JOIN Users ON RecurringDonars.user_id = Users.id WHERE Date(RecurringDonars.next_donation_date) >='${startDate}' AND Date(RecurringDonars.next_donation_date)<='${endDate}' AND (profile_id =${userId} OR project_id In(${element})) AND RecurringDonars.is_recurring=1  ORDER BY RecurringDonars.next_donation_date  DESC LIMIT ${offset},${pageLimit}`;

        count = `SELECT count(id) As totalCount FROM RecurringDonars WHERE( project_id In(${element}) OR profile_id ='${userId}') AND Date(RecurringDonars.next_donation_date) >='${startDate}' AND Date(RecurringDonars.next_donation_date)<='${endDate}' `;

        totalAmount = `SELECT sum(amount)  As totalAmount FROM RecurringDonars WHERE (project_id In(${element}) OR profile_id ='${userId}') AND Date(RecurringDonars.next_donation_date) >='${startDate}' AND Date(RecurringDonars.next_donation_date)<='${endDate}' `;
      }
    }
    let result = "";
    let totalCount = 0;
    let totalEstimatedamount = 0;
    await Finance.sequelize
      .query(resp, {
        bind: ["active"],
        type: QueryTypes.SELECT
      })
      .then(function (resp) {
        result = resp;
      });
    await Finance.sequelize
      .query(count, {
        bind: ["active"],
        type: QueryTypes.SELECT
      })
      .then(function (resp) {
        totalCount = resp;
      });

    await Finance.sequelize
      .query(totalAmount, {
        bind: ["active"],
        type: QueryTypes.SELECT
      })
      .then(function (resp) {
        totalEstimatedamount = resp;
      });
    let pages;
    pages =
      totalCount && totalCount.length ?
      Math.ceil(parseInt(totalCount[0].totalCount) / limit) :
      0;

    return res.status(200).json({
      responseCode: 200,
      data: result,
      totalPages: totalCount && totalCount.length ? totalCount[0].totalCount : 0,
      success: true,
      totalAmount: totalEstimatedamount,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: "We are fetching some problem, try again after some time.",
      success: false,
    });
  }
};

const deleteUserAccount = async (req, res) => {
  try {
    const {
      currentUser
    } = req;
    const result = await User.update({
      is_deleted: true
    }, {
      where: {
        id: currentUser.id
      },
    });
    await Project.update({
      is_deleted: true
    }, {
      where: {
        userId: currentUser.id
      },
    });
    return res.status(200).json({
      responseCode: 200,
      data: result,
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: "We are fetching some problem, try again after some time.",
      success: false,
    });
  }
};

const changeEmail = async (req, res) => {
  const {
    body,
    currentUser
  } = req;
  const {
    email
  } = body;
  try {
    const isUserExist = await User.findOne({
      where: {
        email: email,
        id: {
          [Op.ne]: currentUser.id,
        },
        is_deleted: {
          [Op.ne]: true,
        },
      },
      attributes: ["email"],
    });
    if (isUserExist) {
      return res.status(401).json({
        responseCode: 401,
        message: "This Email Address is already registered with us. Please try to register with another Email Address.",
        success: false,
      });
    }

    let result = await User.update({
      email: email
    }, {
      where: {
        id: currentUser.id
      },
    });
    return res.status(200).json({
      responseCode: 200,
      message: "Email update successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: error.message ?
        error.message :
        "We are fetching some problem, try again after some time.",
      success: false,
    });
  }
};

// Generate account link

const generateAccountLink = async (req, res) => {
  try {
    const currentUser = req.currentUser;
    const userId = currentUser.id;
    let accountId = "";
    let accountLinks = "";
    const accountData = await Donation.findOne({
      where: {
        user_id: userId,
      },
      attributes: ["id", "account_id"],
    });
    if (
      accountData &&
      accountData.dataValues &&
      accountData.dataValues.account_id
    ) {
      accountId = accountData.dataValues.account_id;
      accountLinks = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: process.env.REFRESH_URL,
        return_url: process.env.RETURN_URL,
        type: "account_onboarding",
      });
    } else {
      const email = currentUser.email;
      let userData = {
        email,
        userId
      };
      const result = await stripeCustomerCreate(userData, accountData);
      if (result && result.account_id) {
        accountId = result.account_id;
        accountLinks = await stripe.accountLinks.create({
          account: accountId,
          refresh_url: process.env.REFRESH_URL,
          return_url: process.env.RETURN_URL,
          type: "account_onboarding",
        });
      } else {
        return res.status(400).json({
          responseCode: 400,
          message: "Unable to create stripe account!",
          error: e,
          success: false,
        });
      }
    }

    return res.status(200).json({
      responseCode: 200,
      message: "Account Link generated successfully",
      data: accountLinks,
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      responseCode: 400,
      message: "Unable to generate account link",
      error: error,
      success: false,
    });
  }
};

const getUserProjectList = async (req, res) => {
  try {
    const {
      userId
    } = req.query;
    const result = await Project.findAll({
      where: {
        userId,
        status: "live",
        is_deleted: {
          [Op.ne]: true,
        },
      },
      attributes: ["id", "name"],
    });
    return res.status(200).json({
      responseCode: 200,
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      responseCode: 500,
      message: "Unexpected error occured",
      success: false,
    });
  }
};

const getDonationChart = async (req, res) => {
  try {
    let {
      userId,
      startDate,
      endDate,
      status,
      donationOn,
      projectId,
      donationType,
    } = req.query;
    let date = moment().startOf("year").format("MM-DD-YYYY");
    let condition = {
      is_recurring: donationType === "oneTime" ? 0 : 1,
      payment_status: "Completed",
    };

    if (startDate && endDate) {
      startDate = `${startDate} 00:00:00`;
      endDate = `${endDate} 23:59:00`;
      const startedDate = new Date(startDate);
      const EndDate = new Date(endDate);
      condition = {
        ...condition,
        [Op.and]: [{
            createdAt: {
              [Op.gte]: startedDate,
            },
          },
          {
            createdAt: {
              [Op.lte]: EndDate,
            },
          },
        ],
      };
    }
    if (status && status !== "all") {
      condition = {
        ...condition,
        payment_status: status,
      };
    }
    if (!userId) {
      return res.status(400).json({
        responseCode: 400,
        message: "User Id Not Found",
        success: false,
      });
    }

    const receivedData = await Project.findAll({
      where: {
        userId: userId,
      },
    });
    let element = [];
    for (let index = 0; index < receivedData.length; index++) {
      element = [...element, receivedData[index].dataValues.id];
    }
    if (donationOn || projectId) {
      if (donationOn) {
        condition = {
          ...condition,
          profile_id: userId,
        };
      }
      if (projectId) {
        condition = {
          ...condition,
          project_id: projectId,
        };
      }
    } else {
      condition = {
        ...condition,
        [Op.or]: [{
            project_id: {
              [Op.in]: element,
            },
          },
          {
            profile_id: userId,
          },
        ],
      };
    }
    const result = await await Finance.findAll({
      where: condition,
      attributes: [
        "payout_amount",
        "amount",
        "createdAt",
        [
          Sequelize.fn("date_format", Sequelize.col("createdAt"), "%M"),
          "month",
        ],
        [Sequelize.fn("sum", Sequelize.col("payout_amount")), "total_amount"],
      ],
      group: [
        Sequelize.fn("month", Sequelize.col("createdAt")),
        Sequelize.fn("year", Sequelize.col("createdAt")),
      ],
    });
    return res.status(200).json({
      responseCode: 200,
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      responseCode: 500,
      message: "Unexpected error occured",
      success: false,
    });
  }
};

const donationAnalytic = async (req, res) => {
  try {
    const {
      userId,
      donationType
    } = req.query;
    const receivedData = await Project.findAll({
      where: {
        userId: userId,
      },
    });
    let date = moment().startOf("year").format("MM-DD-YYYY");
    let element = [];
    for (let index = 0; index < receivedData.length; index++) {
      element = [...element, receivedData[index].dataValues.id];
    }
    let condition = {
      [Op.or]: [{
          project_id: {
            [Op.in]: element,
          },
        },
        {
          profile_id: userId,
        },
      ],
      createdAt: {
        [Op.gte]: date,
      },
    };
    if (donationType === "oneTime") {
      condition = {
        ...condition,
        is_recurring: 0,
      };
    } else if (donationType === "monthly") {
      condition = {
        ...condition,
        is_recurring: 1,
      };
    }
    const result = await await Finance.findAll({
      where: condition,
      attributes: [
        [Sequelize.fn("sum", Sequelize.col("payout_amount")), "total_amount"],
      ],
    });
    return res.status(200).json({
      responseCode: 200,
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      responseCode: 500,
      message: "Unexpected error occured",
      success: false,
    });
  }
};

const getTotalSponsor = async (req, res) => {
  try {
    let {
      userId,
      donationType,
      startDate,
      endDate,
      status,
      donationOn,
      projectId,
    } = req.query;
    let result = "";
    const receivedData = await Project.findAll({
      where: {
        userId,
      },
      attributes: ["id", "userId"],
    });
    let element = [];
    for (let index = 0; index < receivedData.length; index++) {
      element = [...element, receivedData[index].dataValues.id];
    }

    if (donationType === "oneTime") {
      let condition = "";
      if (status && status !== "all") {
        condition += `Finance.payment_status ='${status}'`;
      } else {
        condition += `Finance.payment_status='Completed'`;
      }
      if (donationType === "oneTime") {
        condition += ` AND Finance.is_recurring ='0'`;
      } else {
        condition += ` AND Finance.is_recurring ='1'`;
      }
      if (startDate && endDate) {
        startDate = `${startDate} 00:00:00`;
        endDate = `${endDate} 23:59:00`;
        condition += ` AND (Finance.createdAt) >='${startDate}'`;
        condition += ` AND (Finance.createdAt) <='${endDate}'`;
      }

      if (donationOn || projectId) {
        if (donationOn) {
          condition += ` AND Finance.profile_id ='${userId}'`;
        }
        if (projectId) {
          condition += ` AND Finance.project_id IN ('${projectId}')`;
        }
      } else {
        condition += ` AND (Finance.profile_id ='${userId}' OR Finance.project_id IN ('${element}'))`;
      }

      const resp = `SELECT sum(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) + count(distinct user_id) AS count FROM Finances AS Finance WHERE ${condition}`;
      await Finance.sequelize
        .query(resp, {
          bind: ["active"],
          type: QueryTypes.SELECT
        })
        .then(function (resp) {
          result = resp;
        });
    } else {
      let condition = {
        is_recurring: 1,
      };
      if (projectId) {
        condition = {
          ...condition,
          project_id: {
            [Op.in]: element,
          },
        };
      } else if (donationOn) {
        condition = {
          ...condition,
          profile_id: userId,
        };
      } else {
        condition = {
          ...condition,
          [Op.or]: [{
              project_id: {
                [Op.in]: element,
              },
            },
            {
              profile_id: userId,
            },
          ],
        };
      }
      // if (startDate && endDate) {
      //   condition = {
      //     ...condition,
      //     [Op.and]: [
      //       {
      //         next_donation_date: {
      //           [Op.gte]: startDate,
      //         },
      //       },
      //       {
      //         next_donation_date: {
      //           [Op.lte]: endDate,
      //         },
      //       },
      //     ],
      //   };
      // }
      const totalSponsor = await RecurringDonars.count({
        where: condition,
      });
      result = [{
        count: totalSponsor
      }]
    }
    return res.status(200).json({
      responseCode: 200,
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      responseCode: 500,
      message: "Unexpected error occured",
      success: false,
    });
  }
};

const exportDonationReport = async (req, res) => {
  const {
    query
  } = req;
  let {
    userId,
    startDate,
    endDate,
    donationOn,
    projectId,
    status,
    donationType,
    tz,
  } = query;
  const styles = {
    headerDark: {
      fill: {
        fgColor: {},
      },
      font: {
        color: {
          rgb: "FFFFFFFF",
        },
        sz: 12,
        bold: true,
        fontfamily: "Times New Roman",
      },
    },
  };
  let condition = {
    is_recurring: donationType === "oneTime" ? 0 : 1,
    payment_status: "Completed",
  };

  if (startDate && endDate) {
    startDate = `${startDate} 00:00:00`;
    endDate = `${endDate} 23:59:00`;
    const startedDate = new Date(startDate);
    const EndDate = new Date(endDate);
    condition = {
      ...condition,
      [Op.and]: [{
          createdAt: {
            [Op.gte]: startedDate,
          },
        },
        {
          createdAt: {
            [Op.lte]: EndDate,
          },
        },
      ],
    };
  }
  if (status && status !== "all") {
    condition = {
      ...condition,
      payment_status: status,
    };
  }
  const errors = await validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      responseCode: 422,
      message: "Validation error!",
      error: errors.array(),
      success: false,
    });
  }

  if (!userId) {
    return res.status(400).json({
      responseCode: 400,
      message: "User Id Not Found",
      success: false,
    });
  }

  const receivedData = await Project.findAll({
    where: {
      userId: userId,
    },
    attributes: ["id"],
  });
  let element = [];
  for (let index = 0; index < receivedData.length; index++) {
    element = [...element, receivedData[index].dataValues.id];
  }
  if (donationOn || projectId) {
    if (donationOn) {
      condition = {
        ...condition,
        profile_id: userId,
      };
    }
    if (projectId) {
      condition = {
        ...condition,
        project_id: projectId,
      };
    }
  } else {
    condition = {
      ...condition,
      [Op.or]: [{
          project_id: {
            [Op.in]: element,
          },
        },
        {
          profile_id: userId,
        },
      ],
    };
  }
  const data = await Finance.findAndCountAll({
    where: condition,
    include: [{
        model: Project,
        attributes: ["name", "id", "url", "reward"],
      },
      {
        model: User,
        attributes: ["first_name", "last_name", "anonymousUser"],
      },
    ],
    order: [
      ["createdAt", "DESC"]
    ],
    //raw: true
  });
  let result = [];
  if (data && data.rows && data.rows.length) {
    for (let index = 0; index < data.rows.length; index++) {
      let element = data.rows[index].dataValues;
      if (element.fundraiser_id) {
        let fundRaiserInfo = await User.findOne({
          where: {
            id: element.fundraiser_id,
          },
          attributes: ["first_name", "last_name", "email"],
          include: {
            model: Donation,
          },
        });
        result.push({
          ...element,
          fundRaiserInfo
        });
      } else {
        result.push(element);
      }
    }
  }
  const dataset = [];
  for (let i = 0; i < result.length; i++) {
    const {
      full_name,
      email,
      donation_id,
      direct_donation,
      Project,
      payout_amount,
      createdAt,
      payout_succeed,
      payment_by,
      reward_id,
      is_info_sharable,
      status,
      payment_status,
    } = result[i];
    let reward =
      Project && Project.dataValues && Project.dataValues.reward && reward_id ?
      JSON.parse(Project.dataValues.reward).find(
        (item) => item.id === reward_id
      ) :
      "";

    let tempObj;
    tempObj = {
      ["S.No."]: i + 1,
      ["Deposited To"]: direct_donation ?
        "My Profile" :
        Project.dataValues.name,
      ["Deposit Id"]: donation_id,
      ["Deposited By"]: is_info_sharable ? full_name : "Anonymous",
      ["Sponsor Email address "]: is_info_sharable ? email : "-",
      Amount: payout_amount ?
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(payout_amount) :
        "$0.00",
      Reward: reward ? reward.reward_title : "-",
      ["Deposit Date"]: createdAt ?
        moment(createdAt).tz(tz).format("MMM DD, YYYY") :
        "-",
      Status: (payment_by === "paypal" ? payout_succeed : status) ?
        payment_status == "Completed" ?
        "Success" :
        payment_status :
        payment_by === "paypal" ?
        "Pending" :
        "Failed",
    };
    dataset.push(tempObj);
  }
  return res.status(200).send(dataset);
};

const exportDonationXlsReport = async (req, res) => {
  try {
    const {
      query
    } = req;
    let {
      userId,
      startDate,
      endDate,
      donationOn,
      projectId,
      status,
      donationType,
      tz,
    } = query;
    const styles = {
      headerDark: {
        fill: {
          fgColor: {},
        },
        font: {
          color: {
            rgb: "FFFFFFFF",
          },
          sz: 12,
          bold: true,
          fontfamily: "Times New Roman",
        },
      },
    };
    //Here you specify the export structure
    const specification = {
      sNO: {
        // <- the key should match the actual data key
        displayName: "S.No.", // <- Here you specify the column header
        headerStyle: styles.headerDark, // <- Header style
        width: 70, // <- width in pixels
      },
      depositedTo: {
        displayName: "Deposited To",
        headerStyle: styles.headerDark,
        width: 70, // <- width in chars (when the number is passed as string)
      },
      depositId: {
        displayName: "Deposit Id",
        headerStyle: styles.headerDark,
        width: 70,
      },
      depositedBy: {
        displayName: "Deposited By",
        headerStyle: styles.headerDark,
        width: 220,
      },
      SponsorEmailaddress: {
        displayName: "Sponsor Email address",
        headerStyle: styles.headerDark,
        width: 220,
      },
      amount: {
        displayName: "Amount",
        headerStyle: styles.headerDark,
        width: 120,
      },
      reward: {
        displayName: "Reward",
        headerStyle: styles.headerDark,
        width: 120,
      },
      depositDate: {
        displayName: "Deposit Date	",
        headerStyle: styles.headerDark,
        width: 220,
      },
      status: {
        displayName: "Status",
        headerStyle: styles.headerDark,
        width: 120,
      },
    };

    let condition = {
      is_recurring: donationType === "oneTime" ? 0 : 1,
      payment_status: "Completed",
    };

    if (startDate && endDate) {
      startDate = `${startDate} 00:00:00`;
      endDate = `${endDate} 23:59:00`;
      const startedDate = new Date(startDate);
      const EndDate = new Date(endDate);
      condition = {
        ...condition,
        [Op.and]: [{
            createdAt: {
              [Op.gte]: startedDate,
            },
          },
          {
            createdAt: {
              [Op.lte]: EndDate,
            },
          },
        ],
      };
    }
    if (status && status !== "all") {
      condition = {
        ...condition,
        payment_status: status,
      };
    }
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        responseCode: 422,
        message: "Validation error!",
        error: errors.array(),
        success: false,
      });
    }

    if (!userId) {
      return res.status(400).json({
        responseCode: 400,
        message: "User Id Not Found",
        success: false,
      });
    }

    const receivedData = await Project.findAll({
      where: {
        userId: userId,
      },
      attributes: ["id"],
    });
    let element = [];
    for (let index = 0; index < receivedData.length; index++) {
      element = [...element, receivedData[index].dataValues.id];
    }
    if (donationOn || projectId) {
      if (donationOn) {
        condition = {
          ...condition,
          profile_id: userId,
        };
      }
      if (projectId) {
        condition = {
          ...condition,
          project_id: projectId,
        };
      }
    } else {
      condition = {
        ...condition,
        [Op.or]: [{
            project_id: {
              [Op.in]: element,
            },
          },
          {
            profile_id: userId,
          },
        ],
      };
    }
    const data = await Finance.findAndCountAll({
      // offset: 0,
      // limit: 10,
      where: condition,
      include: [{
          model: Project,
          attributes: ["name", "id", "url", "reward"],
        },
        {
          model: User,
          attributes: ["first_name", "last_name", "anonymousUser"],
        },
      ],
      order: [
        ["createdAt", "DESC"]
      ],
      //raw: true
    });
    let result = [];
    if (data && data.rows && data.rows.length) {
      for (let index = 0; index < data.rows.length; index++) {
        let element = data.rows[index].dataValues;
        if (element.fundraiser_id) {
          let fundRaiserInfo = await User.findOne({
            where: {
              id: element.fundraiser_id,
            },
            attributes: ["first_name", "last_name", "email"],
            include: {
              model: Donation,
            },
          });
          result.push({
            ...element,
            fundRaiserInfo
          });
        } else {
          result.push(element);
        }
      }
    }
    const dataset = [];

    for (let i = 0; i < result.length; i++) {
      const {
        full_name,
        email,
        donation_id,
        direct_donation,
        Project,
        amount,
        createdAt,
        payout_succeed,
        payment_by,
        User,
        reward_id,
        is_info_sharable,
        status,
        payout_amount,
        payment_status,
      } = result[i];
      let reward =
        Project && Project.dataValues && Project.dataValues.reward && reward_id ?
        JSON.parse(Project.dataValues.reward).find(
          (item) => item.id === reward_id
        ) :
        "";
      let tempObj;
      tempObj = {
        id: i + 1,
        depositedTo: direct_donation ? "My Profile" : Project.dataValues.name,
        depositId: donation_id,
        depositedBy: is_info_sharable ? full_name : "Anonymous",
        SponsorEmailaddress: is_info_sharable ? email : "-",
        amount: payout_amount ?
          new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(payout_amount) :
          "$0.00",
        reward: reward ? reward.reward_title : "-",
        depositDate: createdAt ?
          moment(createdAt).tz(tz).format("MMM DD, YYYY") :
          "-",
        status: (payment_by === "paypal" ? payout_succeed : status) ?
          payment_status == "Completed" ?
          "Success" :
          payment_status :
          payment_by === "paypal" ?
          "Pending" :
          "Failed",
      };
      dataset.push(tempObj);
    }
    const report = excel.buildExport([
      // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
      {
        name: "Report",
        specification: specification, // <- Report specification
        data: dataset, // <-- Report data
      },
    ]);
    // You can then return this straight
    // res.attachment(moment().format('YYYY_MM_DD') + '_student_report.xlsx'); // This is sails.js specific (in general you need to set headers)
    return res.status(200).send(report);
  } catch (error) {
    return res.status(500).json({
      responsecode: 500,
      message: error.message ? error.message : "Unexpected error occure.",
      success: false,
    });
  }
};

const exportSentDonationXlsReport = async (req, res) => {
  try {
    const {
      query
    } = req;
    let {
      userId,
      startDate,
      endDate,
      donationOn,
      projectId,
      status,
      donationType,
      tz,
    } = query;
    const styles = {
      headerDark: {
        fill: {
          fgColor: {},
        },
        font: {
          color: {
            rgb: "FFFFFFFF",
          },
          sz: 12,
          bold: true,
          fontfamily: "Times New Roman",
        },
      },
    };
    //Here you specify the export structure
    let specification = {
      sNO: {
        // <- the key should match the actual data key
        displayName: "S.No.", // <- Here you specify the column header
        headerStyle: styles.headerDark, // <- Header style
        width: 70, // <- width in pixels
      },
      "project/people": {
        displayName: "Project/ People",
        headerStyle: styles.headerDark,
        width: 70, // <- width in chars (when the number is passed as string)
      },
      donationId: {
        displayName: "Donation Id",
        headerStyle: styles.headerDark,
        width: 70,
      },
      amount: {
        displayName: "Amount",
        headerStyle: styles.headerDark,
        width: 120,
      },
      reward: {
        displayName: "Reward",
        headerStyle: styles.headerDark,
        width: 120,
      },
      paymentDate: {
        displayName: "Payment Date",
        headerStyle: styles.headerDark,
        width: 220,
      },
      status: {
        displayName: "Status",
        headerStyle: styles.headerDark,
        width: 120,
      },
    };

    let condition = {
      payment_status: "Completed",
      is_recurring: donationType === "oneTime" ? 0 : 1,

      user_id: userId,
    };
    if (parseInt(donationOn) === 1) {
      condition = {
        ...condition,
        direct_donation: 1,
      };
    }
    if (parseInt(donationOn) === 0) {
      condition = {
        ...condition,
        direct_donation: {
          [Op.eq]: null,
        },
      };
    }
    if (startDate && endDate) {
      startDate = `${startDate} 00:00:00`;
      endDate = `${endDate} 23:59:00`;
      const startedDate = new Date(startDate);
      const EndDate = new Date(endDate);
      condition = {
        ...condition,
        [Op.and]: [{
            createdAt: {
              [Op.gte]: startedDate,
            },
          },
          {
            createdAt: {
              [Op.lte]: EndDate,
            },
          },
        ],
      };
    }
    if (status && status !== "all") {
      condition = {
        ...condition,
        payment_status: status,
      };
    }
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        responseCode: 422,
        message: "Validation error!",
        error: errors.array(),
        success: false,
      });
    }

    if (!userId) {
      return res.status(400).json({
        responseCode: 400,
        message: "User Id Not Found",
        success: false,
      });
    }

    let includeTable = [];
    if (donationOn && donationOn !== "all") {
      // this for project donation
      if (parseInt(donationOn) === 0) {
        includeTable = [{
          model: Project,
          attributes: ["name", "id", "url", "reward"],
        }, ];
      }
      // this for profile donation
      else if (parseInt(donationOn) === 1) {
        includeTable = [{
          model: User,
          attributes: ["first_name", "last_name"],
        }, ];
      }
    } else {
      includeTable = [{
          model: Project,
          attributes: ["name", "id", "url", "reward"],
        },
        {
          model: User,
          attributes: ["first_name", "last_name"],
        },
      ];
    }
    let receivedData = [];
    if (donationOn && donationOn !== "all") {
      if (parseInt(donationOn) === 0) {
        receivedData = await Project.findAll({
          where: {
            userId: userId,
          },
        });
      }
    } else {
      receivedData = await Project.findAll({
        where: {
          userId: userId,
        },
      });
    }
    let element = [];
    for (let index = 0; index < receivedData.length; index++) {
      element = [...element, receivedData[index].dataValues.id];
    }
    let result = [];
    const sentTrans = await Finance.findAndCountAll({
      where: condition,
      include: includeTable,
      order: [
        ["createdAt", "DESC"]
      ],
      // raw: true
    });

    let profileInfo = [];
    for (let index = 0; index < sentTrans.rows.length; index++) {
      let element = sentTrans.rows[index].dataValues;
      if (donationOn && donationOn !== "all") {
        //project donation
        if (parseInt(donationOn) === 0) {
          result.push(element);
        }
        //profile donation
        else if (parseInt(donationOn) === 1) {
          profileInfo = await User.findOne({
            where: {
              id: element.profile_id,
            },
            attributes: ["first_name", "last_name", "profileUrl"],
            raw: true,
          });
          result.push({
            element,
            profileInfo
          });
        }
      } else {
        if (element.direct_donation) {
          profileInfo = await User.findOne({
            where: {
              id: element.profile_id,
            },
            attributes: ["first_name", "last_name", "profileUrl"],
            raw: true,
          });
          result.push({
            element,
            profileInfo
          });
        } else {
          result.push(element);
        }
      }
    }
    const dataset = [];
    for (let i = 0; i < result.length; i++) {
      const {
        element,
        donation_id,
        Project,
        amount,
        createdAt,
        payout_succeed,
        payment_by,
        reward_id,
        status,
        profileInfo,
        is_recurring,
        next_donation_date,
      } = result[i];
      let reward =
        Project && Project.dataValues && Project.dataValues.reward && reward_id ?
        JSON.parse(Project.dataValues.reward).find(
          (item) => item.id === reward_id
        ) :
        "";
      let donationAmount = element ? element.amount : amount;
      let donationDate = element ? element.createdAt : createdAt;
      if (is_recurring) {
        delete specification.status;
        specification = {
          ...specification,
          nextDonationDate: {
            displayName: "Next Donation Date",
            headerStyle: styles.headerDark,
            width: 220,
          },
          status: {
            displayName: "Status",
            headerStyle: styles.headerDark,
            width: 120,
          },
        };
      }
      if (element && element.is_recurring) {
        delete specification.status;
        specification = {
          ...specification,
          nextDonationDate: {
            displayName: "Next Donation Date",
            headerStyle: styles.headerDark,
            width: 220,
          },
          status: {
            displayName: "Status",
            headerStyle: styles.headerDark,
            width: 120,
          },
        };
      }
      let tempObj;
      tempObj = {
        id: i + 1,
        "project/people": element && element.direct_donation ?
          `${profileInfo.first_name} ${profileInfo.last_name}` :
          Project && Project.dataValues.name,
        donationId: element ? element.donation_id : donation_id,
        amount: donationAmount ?
          new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(donationAmount) :
          "$0.00",
        reward: reward ? reward.reward_title : "-",
        paymentDate: donationDate ?
          moment(donationDate).tz(tz).format("MMM DD, YYYY") :
          "-",
        status: element ?
          element.status ?
          "Success" :
          "Failed" :
          status ?
          "Success" :
          "Failed",
      };
      if (is_recurring) {
        tempObj = {
          ...tempObj,
          nextDonationDate: moment(next_donation_date)
            .tz(tz)
            .format("MMM DD, YYYY"),
        };
      }
      if (element && element.is_recurring) {
        tempObj = {
          ...tempObj,
          nextDonationDate: moment(element.next_donation_date)
            .tz(tz)
            .format("MMM DD, YYYY"),
        };
      }
      dataset.push(tempObj);
    }
    const report = excel.buildExport([
      // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
      {
        name: "Report",
        specification: specification, // <- Report specification
        data: dataset, // <-- Report data
      },
    ]);
    // You can then return this straight
    // res.attachment(moment().format('YYYY_MM_DD') + '_student_report.xlsx'); // This is sails.js specific (in general you need to set headers)
    return res.status(200).send(report);
  } catch (error) {
    return res.status(500).json({
      responsecode: 500,
      message: error.message ? error.message : "Unexpected error occure.",
      success: false,
    });
  }
};

const exportSentDonationCsvReport = async (req, res) => {
  try {
    const {
      query
    } = req;
    let {
      userId,
      startDate,
      endDate,
      donationOn,
      projectId,
      status,
      donationType,
      tz,
    } = query;
    let condition = {
      payment_status: "Completed",
      is_recurring: donationType === "oneTime" ? 0 : 1,
      user_id: userId,
    };
    if (donationOn && donationOn !== "all") {
      if (parseInt(donationOn) === 1) {
        condition = {
          ...condition,
          direct_donation: 1,
        };
      }
      if (parseInt(donationOn) === 0) {
        condition = {
          ...condition,
          direct_donation: {
            [Op.eq]: null,
          },
        };
      }
    }

    if (startDate && endDate) {
      startDate = `${startDate} 00:00:00`;
      endDate = `${endDate} 23:59:00`;
      const startedDate = new Date(startDate);
      const EndDate = new Date(endDate);
      condition = {
        ...condition,
        [Op.and]: [{
            createdAt: {
              [Op.gte]: startedDate,
            },
          },
          {
            createdAt: {
              [Op.lte]: EndDate,
            },
          },
        ],
      };
    }
    if (status && status !== "all") {
      condition = {
        ...condition,
        payment_status: status,
      };
    }
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        responseCode: 422,
        message: "Validation error!",
        error: errors.array(),
        success: false,
      });
    }

    if (!userId) {
      return res.status(400).json({
        responseCode: 400,
        message: "User Id Not Found",
        success: false,
      });
    }

    let includeTable = [];
    if (donationOn && donationOn !== "all") {
      // this for project donation
      if (parseInt(donationOn) === 0) {
        includeTable = [{
          model: Project,
          attributes: ["name", "id", "url", "reward"],
        }, ];
      }
      // this for profile donation
      else if (parseInt(donationOn) === 1) {
        includeTable = [{
          model: User,
          attributes: ["first_name", "last_name"],
        }, ];
      }
    } else {
      includeTable = [{
          model: Project,
          attributes: ["name", "id", "url", "reward"],
        },
        {
          model: User,
          attributes: ["first_name", "last_name"],
        },
      ];
    }
    let receivedData = [];
    if (donationOn && donationOn !== "all") {
      if (parseInt(donationOn) === 0) {
        receivedData = await Project.findAll({
          where: {
            userId: userId,
          },
        });
      }
    } else {
      receivedData = await Project.findAll({
        where: {
          userId: userId,
        },
      });
    }
    let element = [];
    for (let index = 0; index < receivedData.length; index++) {
      element = [...element, receivedData[index].dataValues.id];
    }
    let result = [];
    const sentTrans = await Finance.findAndCountAll({
      where: condition,
      include: includeTable,
      order: [
        ["createdAt", "DESC"]
      ],
      // raw: true
    });

    let profileInfo = [];
    for (let index = 0; index < sentTrans.rows.length; index++) {
      let element = sentTrans.rows[index].dataValues;
      if (donationOn && donationOn !== "all") {
        //project donation
        if (parseInt(donationOn) === 0) {
          result.push(element);
        }
        //profile donation
        else if (parseInt(donationOn) === 1) {
          profileInfo = await User.findOne({
            where: {
              id: element.profile_id,
            },
            attributes: ["first_name", "last_name", "profileUrl"],
            raw: true,
          });
          result.push({
            element,
            profileInfo
          });
        }
      } else {
        if (element.direct_donation) {
          profileInfo = await User.findOne({
            where: {
              id: element.profile_id,
            },
            attributes: ["first_name", "last_name", "profileUrl"],
            raw: true,
          });
          result.push({
            element,
            profileInfo
          });
        } else {
          result.push(element);
        }
      }
    }
    const dataset = [];
    for (let i = 0; i < result.length; i++) {
      const {
        element,
        donation_id,
        Project,
        amount,
        createdAt,
        reward_id,
        status,
        profileInfo,
        is_recurring,
        next_donation_date,
      } = result[i];
      let reward =
        Project && Project.dataValues && Project.dataValues.reward && reward_id ?
        JSON.parse(Project.dataValues.reward).find(
          (item) => item.id === reward_id
        ) :
        "";
      let donationAmount = element ? element.amount : amount;
      let donationDate = element ? element.createdAt : createdAt;
      let tempObj;
      tempObj = {
        id: i + 1,
        "Project/ people": element && element.direct_donation ?
          `${profileInfo.first_name} ${profileInfo.last_name}` :
          Project && Project.dataValues.name,
        "Donation Id": element ? element.donation_id : donation_id,
        Amount: donationAmount ?
          new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(donationAmount) :
          "$0.00",
        Reward: reward ? reward.reward_title : "-",
        "Payment Date": donationDate ?
          moment(donationDate).tz(tz).format("MMM DD, YYYY") :
          "-",
        Status: element ?
          element.status ?
          "Success" :
          "Failed" :
          status ?
          "Success" :
          "Failed",
      };
      if (is_recurring) {
        delete tempObj.Status;
        tempObj = {
          ...tempObj,
          "Next Donation Date": moment(next_donation_date)
            .tz(tz)
            .format("MMM DD, YYYY"),
          Status: element ?
            element.status ?
            "Success" :
            "Failed" :
            status ?
            "Success" :
            "Failed",
        };
      }
      if (element && element.is_recurring) {
        delete tempObj.Status;
        tempObj = {
          ...tempObj,
          "Next Donation Date": moment(element.next_donation_date)
            .tz(tz)
            .format("MMM DD, YYYY"),
          Status: element ?
            element.status ?
            "Success" :
            "Failed" :
            status ?
            "Success" :
            "Failed",
        };
      }
      dataset.push(tempObj);
    }
    // You can then return this straight
    // res.attachment(moment().format('YYYY_MM_DD') + '_student_report.xlsx'); // This is sails.js specific (in general you need to set headers)
    return res.status(200).send(dataset);
  } catch (error) {
    return res.status(500).json({
      responsecode: 500,
      message: error.message ? error.message : "Unexpected error occure.",
      success: false,
    });
  }
};


const chargeEnabled = async (req, res) => {
  try {
    const {
      body: {
        account,
        data
      },
    } = req;
    const donationData = await Donation.findOne({
      where: {
        account_id: account,
      },
    });
    if (donationData) {
      const userData = await User.findOne({
        where: {
          id: donationData.dataValues.user_id
        },
      });
      if (data.object.payouts_enabled) {

        await User.update({
          is_verified: true,
          is_acc_updated: true,
        }, {
          where: {
            id: userData.id,
          },
        });
        if (!userData.is_verified) {
          await new emailSender().sendMail(
            [userData.email],
            "Bank account verification success",
            "",
            "CashFundHer",
            "",
            "bankAccountVerification", {
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
    }
  } catch (error) {
    return res.status(500).json({
      responsecode: 500,
      message: error.message ? error.message : "Unexpected error occure.",
      success: false,
    });
  }
};
module.exports = {
  userSignup,
  userSignin,
  socialLogin,
  userForgotPassword,
  userVerification,
  userResetPassword,
  userChangePassword,
  userProfilePhoto,
  getDonationOfUser,
  receiveProjectDonationTransactions,
  receiveProfileDonationTransactions,
  receiveDonationTransactionsOneTime,
  receiveDonationTransactionsMonthly,
  sentDonationTransactionsMonthly,
  sentDonationTransactionsOneTime,
  sentProjectDonationTransactions,
  sentProfileDonationTransactions,
  adminProxyLogin,
  recurringDonars,
  recurringDonarsRecieve,
  getDetailsByURL,
  stripeLiveWebhook,
  showFeaturedProfiles,
  socialSignup,
  addPlan,
  addMemberstoMailchimpList,
  updateCapabilities,
  donationCollected,
  deleteUserAccount,
  changeEmail,
  getUserProjectList,
  getDonationChart,
  donationAnalytic,
  getTotalSponsor,
  exportDonationReport,
  generateAccountLink,
  exportDonationXlsReport,
  exportSentDonationXlsReport,
  exportSentDonationCsvReport,
  chargeEnabled
};