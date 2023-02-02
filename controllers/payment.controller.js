/** @format */

'use strict';

const {
  Finance,
  User,
  Project,
  Donation,
  RecurringDonars,
} = require('../models');

const {
  stripe_private_key,
  FrontendUrl
} = require('./../constants');

const {
  paypalGetRequest,
  cancelSubscription,
  getPaypalOrderId,
  getEmailPaypalOrderId,
  getBillingAgreementDetail,
  getPartnersReferralPayload,
} = require('../helpers/paypalApiHelper');
const stripe = require('stripe')(stripe_private_key);
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
var moment = require('moment');
const emailSender = require('../helpers/mailSender');
stripe.setApiVersion('2020-08-27'); // SET API VERSION

//subscribe Recurring Payment through paypal
const onSubscribePaypalPlan = async (req, res) => {
  const {
    body: {
      subscriptionID,
      amount: subscriptionAmount,
      directDonation,
      userId,
      projectId,
      receiverId,
      tipAmount,
      tipPrecentage,
      is_info_sharable,
      name,
      email,
      phone,
    },
  } = req;
  try {
    if (!subscriptionID) {
      return res.status(400).json({
        responseCode: 400,
        message: 'subscriptionID not provided',
        success: false,
      });
    }
    const amount = parseFloat(subscriptionAmount).toFixed(2);
    // Details of donor
    let userData = await User.findOne({
      where: {
        id: userId,
      },
    });
    // To create user in case of guest checkout
    if (!userData && !userId) {
      var anonymousUserData = await createAnonymous();
      userData = anonymousUserData;
    }
    // To check whether this project or profile has already subscribed by user
    const recurringData = userId ?
      await RecurringDonars.findOne({
        where: {
          user_id: userId ? userId : userData.id,
          project_id: projectId ? projectId : null,
          profile_id: req.body.receiverId ? req.body.receiverId : null,
          subscribed_by: 'paypal',
        },
      }) :
      {};
    // cancel the already subscribed plan
    if (
      recurringData &&
      recurringData.subscribed_by === 'paypal' &&
      recurringData.is_recurring &&
      (recurringData.project_id === req.body.projectId ||
        recurringData.profile_id === req.body.receiverId) &&
      (recurringData.user_id === req.body.userId ||
        recurringData.user_id === userData.id)
    ) {
      const result = await cancelSubscription(recurringData.subscription_id);
      if (!result.isError) {
        await RecurringDonars.update({
          next_donation_date: moment().add(1, 'months'),
          amount: amount,
          is_recurring: true,
          direct_donation: directDonation ? directDonation : null,
          subscription_id: subscriptionID,
          tip_amount: tipAmount || (amount * 0.075).toFixed(2),
          tip_percentage: tipPrecentage,
          is_info_sharable,
        }, {
          where: {
            id: recurringData.id,
          },
        }, );
      }
    } else {
      await RecurringDonars.build({
        is_recurring: true,
        user_id: userId ? userId : userData ? userData.id : null,
        project_id: projectId ? projectId : null,
        amount: amount,
        subscribed_by: 'paypal',
        subscription_id: subscriptionID,
        profile_id: receiverId ? receiverId : null,
        direct_donation: directDonation ? directDonation : null,
        next_donation_date: moment().add(1, 'months'),
        tip_amount: tipAmount || (amount * 0.075).toFixed(2),
        tip_percentage: tipPrecentage,
        is_info_sharable,
        full_name: name || '',
        email: is_info_sharable ? email : '',
        phone: phone || '',
      }).save();
    }
    return res.status(200).json({
      responsecode: 200,
      message: 'subscribed successfully',
      success: true,
    });
  } catch (error) {
    console.log(error, 'errorrrrrrrrrrrrr');
    return res.status(500).json({
      responsecode: 500,
      message: 'We are fetching some problem,try again after some time',
      success: false,
    });
  }
};

//UnSubscribe Recurring Payment
const UnSubscribeRecurringPayment = async (req, res) => {
  const {
    body
  } = req;
  try {
    if (!body.userId) {
      return res.status(400).json({
        responsecode: 400,
        message: 'UserId not provided',
        success: false,
      });
    }
    let condition = {
      is_recurring: true,
      user_id: body.userId,
    };
    if (body.directDonation) {
      condition = {
        ...condition,
        profile_id: body.profile_id
      };
    } else {
      condition = {
        ...condition,
        project_id: body.projectId
      };
    }
    const userData = await User.findOne({
      where: {
        id: body.userId,
      },
    });
    console.log(body, 'body.profile_id');
    const fundRaiser = await User.findOne({
      where: {
        id: body.fundraiserId,
      },
    });
    console.log(fundRaiser, 'fundRaiserfundRaiser');
    const checkrecurring = await RecurringDonars.findOne({
      where: condition,
    });
    if (checkrecurring && checkrecurring.length === '0') {
      const resp = await User.update({
        is_recurring: false,
      }, {
        where: {
          id: req.body.userId,
        },
      }, );
    }

    const directDonationUserName = await User.findOne({
      where: {
        id: checkrecurring.profile_id,
      },
      attributes: ['first_name', 'last_name'],
    });

    const projectData = await Project.findOne({
      where: {
        id: body.projectId,
      },
    });
    // if (!body.projectId) {
    //   return res.status(400).json({
    //     responsecode: 400,
    //     message: "ProjectId not provided",
    //     success: false
    //   });
    // }

    if (body.subscribedBy === 'paypal') {
      const result = await cancelSubscription(body.subscriptionID);
      console.log(result, 'result while cancel the subscription');
      if (result.isError) {
        return res.status(400).json({
          responsecode: 400,
          message: 'Error while cancelling the subscription',
          success: false,
        });
      }
    }
    if (body.directDonation === true) {
      await RecurringDonars.update({
        next_donation_date: null,
        is_recurring: false,
      }, {
        where: {
          user_id: body.userId,
          profile_id: body.profile_id,
        },
      }, );
    } else {
      await RecurringDonars.update({
        next_donation_date: null,
        is_recurring: false,
      }, {
        where: {
          user_id: body.userId,
          project_id: body.projectId,
        },
      }, );
    }
    if (userData) {
      {
        checkrecurring.direct_donation ?
          new emailSender().sendMail(
            [userData.email],
            'Donation Unsubscription',
            ' ',
            'GoFundHer',
            // project.User ? project.User.email : "",
            ' ',
            'unsubscribeUser', {
              first_name: userData.first_name,
              last_name: userData.last_name,
              amount: checkrecurring.amount,
              name: directDonationUserName.first_name,
              lastName: directDonationUserName.last_name,
            },
            true,
          ) :
          new emailSender().sendMail(
            [userData.email],
            'Donation Unsubscription ',
            ' ',
            'GoFundHer',
            // project.User ? project.User.email : "",
            ' ',
            'unsubscribeProject', {
              first_name: userData.first_name,
              last_name: userData.last_name,
              amount: checkrecurring.amount,
              name: projectData ? projectData.name : '',
            },
            true,
          );
      }
    }
    if (fundRaiser) {
      console.log(
        fundRaiser.email,
        'fundRaiser.dataValuesfundRaiser.dataValues',
        checkrecurring.direct_donation,
      ); {
        checkrecurring.direct_donation ?
          new emailSender().sendMail(
            [fundRaiser.email],
            'Donation Unsubscription',
            ' ',
            'GoFundHer',
            // project.User ? project.User.email : "",
            ' ',
            'unsubscribeFundraiser', {
              first_name: fundRaiser.first_name,
              last_name: fundRaiser.last_name,
              amount: checkrecurring.amount,
              name: userData.first_name,
              lastName: userData.last_name,
            },
            true,
          ) :
          new emailSender().sendMail(
            [fundRaiser.dataValues.email],
            'Donation Unsubscription ',
            ' ',
            'GoFundHer',
            // project.User ? project.User.email : "",
            ' ',
            'unsubscribeProjectOwner', {
              first_name: fundRaiser.dataValues.first_name,
              last_name: fundRaiser.dataValues.last_name,
              amount: checkrecurring.amount,
              name: projectData ? projectData.name : '',
              donarName: [userData.first_name, userData.last_name].join(' '),
            },
            true,
          );
      }
    }
    return res.status(200).json({
      responsecode: 200,
      message: 'Unsubscribed successfully',
      success: true,
    });
  } catch (error) {
    console.log(error, 'errorrrrrrrrrr');

    return res.status(500).json({
      responsecode: 500,
      message: 'We are fetching some problem,try again after some time',
      success: false,
    });
  }
};

/* CREATED BY: RISHABH BULA,
   CREATED AT: 13/02/2019
   UPDATED BY: RISHABH BULA,
   UPDATED AT: 14/02/2019
*/

const createAnonymous = async () => {
  try {
    let firstName = 'anonymous';
    const userRec = await User.findAll({
      limit: 1,
      where: {
        anonymousUser: 1,
      },
      order: [
        ['createdAt', 'DESC'],
        ['id', 'desc'],
      ],
    });
    let lastName = '1';
    let email = '';

    if (userRec.length === 0) {
      email = 'anonymous' + lastName + '@gofundher.com';
    } else {
      lastName = parseInt(userRec[0].dataValues.last_name) +Math.round( Math.random() * 100000) || '';
      email = 'anonymous' + lastName + '@gofundher.com';
    }

    let anonymousUserData = await User.build({
      first_name: firstName,
      last_name: lastName,
      email: email,
      password: '',
      street: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      personal_website: '',
      facebook: '',
      twitter: '',
      bio: '',
      is_receive_news: 0,
      avatar: '',
      is_social: 0,
      forget_token: '',
      is_verified: 0,
      is_acc_updated: 0,
      last_login: new Date(),
      profileUrl: '',
      isActive: 1,
      anonymousUser: 1,
      plan_id: null,
    }).save();
    return anonymousUserData.dataValues;
  } catch (error) {
    console.log(error, 'errorrrrrrrrrrrr');
  }
};

const paypalWebhooks = async (req, res) => {
  const {
    event_type
  } = req.body;
  switch (event_type) {
    case 'PAYMENT.CAPTURE.COMPLETED': {
      const {
        id: webhookEventId,
        resource: {
          id,
          seller_receivable_breakdown,
          status,
          custom_id
        },
      } = req.body;
      updatePaymentStatus(
        custom_id,
        id,
        seller_receivable_breakdown.paypal_fee.value,
        status,
        webhookEventId,
        res,
      );
    }
    break;
  case 'PAYMENT.SALE.COMPLETED':
    recurringChargeWebhook(req, res);
    break;
  case 'BILLING.SUBSCRIPTION.CANCELLED':
    unsubscribeWebhookHandler(req, res);
    break;
  case 'PAYMENT.PAYOUTSBATCH.SUCCESS':
    payoutSuccessWebhookHandler(req, res);
    break;
  default:
    break;
  }
};
// I think this is for paypal
const recurringChargeWebhook = async (req, res) => {
  const {
    id: webhookEventId,
    resource
  } = req.body;
  const recurringData = await RecurringDonars.findOne({
    where: {
      subscription_id: resource.billing_agreement_id,
    },
  });
  if (!recurringData) {
    return;
  }
  // In case to prevent duplicate entries on same webhook event id
  const financeRecord = await Finance.findOne({
    where: {
      webhook_event_id: {
        [Op.eq]: webhookEventId,
      },
    },
  });
  if (financeRecord) {
    return;
  }
  const {
    user_id,
    project_id,
    profile_id,
    direct_donation,
    amount,
    tip_amount,
    tip_percentage,
    is_info_sharable,
    full_name,
    email,
    phone
  } = recurringData;
  // Donor's details
  const userData = await User.findOne({
    where: {
      id: user_id,
    },
  });
  // Fundraiser's project detail
  const projectData = await Project.findOne({
    where: {
      id: project_id
    },
    include: [{
      model: User,
      attributes: ['email'],
    }, ],
    raw: true,
  });
  // Details of fundraiser
  const ccUserData = await User.findOne({
    where: {
      id: projectData ? projectData.userId : profile_id
    },
    raw: true,
  });
  let financeMainData = {
    user_id,
    full_name,
    email: is_info_sharable ? email : '',
    phone,
    is_info_sharable,
    project_id,
    checkout_id: resource.id,
    amount: resource.amount.total,
    payment_by: 'paypal',
    reward_id: null,
    next_donation_date: moment().add(1, 'months'),
    is_recurring: 1,
    profile_id,
    direct_donation,
    website_amount: tip_amount,
    tip_percentage,
    payout_amount: resource.amount.total - tip_amount - parseFloat(resource.transaction_fee.value),
    transfer_id: resource.id,
    payment_status: resource.state === 'completed' ? 'Completed' : '',
    status: resource.state === 'completed' ? 1 : 0,
    payout_succeed: 0,
    webhook_event_id: webhookEventId,
  };
  const financeStore = new Finance(financeMainData);
  const financeData = await financeStore.save();
  const customId = 'GFH-' + financeData.dataValues.id.toString().padStart(5, '0');
  Finance.update({
    donation_id: customId,
  }, {
    where: {
      id: financeData.dataValues.id,
    },
  }, );
  const {
    isError,
    data
  } = await getBillingAgreementDetail(
    resource.billing_agreement_id,
  );
  if (isError) {
    return;
  }
  // Save next donation date in a database for later.
  await RecurringDonars.update({
    next_donation_date: moment().add(1, 'months'),
  }, {
    where: {
      subscription_id: resource.billing_agreement_id,
    },
  }, );
  if (userData) {
    !project_id
      ?
      new emailSender().sendMail(
        userData ? [userData.email] : [],
        // check for cycle complete it's first time or renewal one
        data.billing_info.cycle_executions[0].cycles_completed === 0 ?
        'Thank you for Donating! ' :
        'Donation Renewal',
        ' ',
        'GoFundHer',
        '',
        // ccUserData ? ccUserData.email : "",
        data.billing_info.cycle_executions[0].cycles_completed === 0 ?
        'monthlyUser' :
        'donationRenewalUser', {
          first_name: userData ? userData.first_name : 'Anonymous',
          last_name: userData ? userData.last_name : '',
          amount: amount,
          name: ccUserData ? ccUserData.first_name : '',
          lastName: ccUserData ? ccUserData.last_name : '',
          date: moment()
            .add(1, 'months')
            .format('MMMM Do, YYYY'),
        },
        true,
      ) :
      new emailSender().sendMail(
        userData ? [userData.email] : [],
        data.billing_info.cycle_executions[0].cycles_completed === 0 ?
        'Thank you for Donating! ' :
        'Donation Renewal',
        ' ',
        'GoFundHer',
        '',
        // ccUserData ? ccUserData.email : "",
        data.billing_info.cycle_executions[0].cycles_completed === 0 ?
        'monthlyProject' :
        'donationRenewalProject', {
          first_name: userData ? userData.first_name : 'Anonymous',
          last_name: userData ? userData.last_name : '',
          amount: amount,
          name: projectData ? projectData.name : null,
          date: moment()
            .add(1, 'months')
            .format('MMMM Do, YYYY'),
        },
        true,
      );
  }
  // to send email to fundraiser
  !project_id
    ?
    new emailSender().sendMail(
      ccUserData ? [ccUserData.email] : [],
      'You have received donation',
      ' ',
      'GoFundHer',
      '',
      // ccUserData ? ccUserData.email : "",
      'ReceivedMonthlyUser', {
        first_name: ccUserData ? ccUserData.first_name : 'Anonymous',
        last_name: ccUserData ? ccUserData.last_name : '',
        amount: amount,
        name: ccUserData ? ccUserData.first_name : '',
        lastName: ccUserData ? ccUserData.last_name : '',
        donatedBy: userData && !userData.anonymousUser ?
          [userData.first_name, userData.last_name].join(' ') :
          'Anonymous',
        date: moment()
          .add(1, 'months')
          .format('MMMM Do, YYYY'),
        comment: '',
      },
      true,
    ) :
    new emailSender().sendMail(
      ccUserData ? [ccUserData.email] : [],
      'You have received donation',
      ' ',
      'GoFundHer',
      '',
      // ccUserData ? ccUserData.email : "",
      'ReceivedMonthlyProject', {
        first_name: ccUserData ? ccUserData.first_name : 'Anonymous',
        last_name: ccUserData ? ccUserData.last_name : '',
        amount: amount,
        name: projectData ? projectData.name : null,
        donatedBy: userData && !userData.anonymousUser ?
          [userData.first_name, userData.last_name].join(' ') :
          'Anonymous',
        date: moment()
          .add(1, 'months')
          .format('MMMM Do, YYYY'),
        comment: '',
      },
      true,
    );
  if (direct_donation) {
    return res.status(200).json({
      responseCode: 200,
      success: true,
    });
  } else {
    await updateProjectFund(project_id);
    return res.status(200).json({
      responseCode: 200,
      success: true,
    });
  }
};

// To update paypal payment status when event status occur
const updatePaymentStatus = async (
  donationId,
  paymentId,
  paymentFees,
  status,
  webhookEventId,
  res,
) => {
  const financeData = await Finance.findOne({
    where: {
      donation_id: donationId,
      webhook_event_id: {
        [Op.or]: {
          [Op.ne]: webhookEventId,
          [Op.eq]: null,
        },
      },
    },
  });
  // To format the donation amount
  // const amount = parseFloat(req.body.amount).toFixed(2);
  try {
    // Details of donor
    if (financeData) {
      const {
        amount,
        user_id,
        project_id,
        profile_id,
        is_recurring,
        direct_donation, // If donation is on her profile
        website_amount,
        comment,
      } = financeData;
      let userData = await User.findOne({
        where: {
          id: user_id,
        },
      });
      let projectData = null;
      // Details of fundraiser's profile in case of direct donation
      if (!direct_donation) {
        // Details of fundraiser's project
        projectData = await Project.findOne({
          where: {
            id: project_id,
          },
        });
      }
      // Details of fundraiser like email id
      const ccUserData = await User.findOne({
        where: {
          id: project_id ? projectData.userId : profile_id
        },
        raw: true,
      });
      await Finance.update({
        payment_status: status,
        checkout_id: paymentId,
        transfer_id: paymentId,
        payout_amount: amount - website_amount - paymentFees,
        status: 1,
        webhook_event_id: webhookEventId,
      }, {
        where: {
          donation_id: donationId,
        },
      }, );

      if (userData) {
        // to send email to donor on successful donation on project/profile
        direct_donation
          ?
          new emailSender().sendMail(
            [userData.email],
            'Thank you for Donating! ',
            ' ',
            'GoFundHer',
            '',
            // ccUserData.email,
            is_recurring ? 'monthlyUser' : 'oneTimeUser', {
              first_name: userData ? userData.first_name : 'Anonymous',
              last_name: userData ? userData.last_name : '',
              amount: amount,
              name: ccUserData ? ccUserData.first_name : '',
              lastName: ccUserData ? ccUserData.last_name : '',
              date: is_recurring ?
                moment()
                .add(1, 'months')
                .format('MMMM Do, YYYY') :
                null,
            },
            true,
          ) :
          new emailSender().sendMail(
            [userData.email],
            'Thank you for Donating! ',
            ' ',
            'GoFundHer',
            '',
            // projectData.User ? projectData.User.email : ccUserData.email,
            is_recurring ? 'monthlyProject' : 'oneTimeProject', {
              first_name: userData ? userData.first_name : 'Anonymous',
              last_name: userData ? userData.last_name : '',
              amount: amount,
              name: projectData ? projectData.name : '',
              date: is_recurring ?
                moment()
                .add(1, 'months')
                .format('MMMM Do, YYYY') :
                null,
            },
            true,
          );
      }
      // to send email to fundraiser on receiving donation on project/profile
      direct_donation
        ?
        new emailSender().sendMail(
          ccUserData ? [ccUserData.email] : [],
          'You have received donation',
          ' ',
          'GoFundHer',
          '',
          // ccUserData.email,
          is_recurring ? 'ReceivedMonthlyUser' : 'ReceivedOnetimeUser', {
            first_name: ccUserData ? ccUserData.first_name : '',
            last_name: ccUserData ? ccUserData.last_name : '',
            amount: amount,
            name: ccUserData ? ccUserData.first_name : '',
            lastName: ccUserData ? ccUserData.last_name : '',
            donatedBy: user_id && userData ?
              [userData.first_name, userData.last_name].join(' ') :
              'Anonymous',
            comment: comment ?
              `<b>Message from your donor: </b>${comment}` :
              '',
            date: is_recurring ?
              moment()
              .add(1, 'months')
              .format('MMMM Do, YYYY') :
              null,
            comment,
          },
          true,
        ) :
        new emailSender().sendMail(
          [ccUserData.email],
          'You have received donation',
          ' ',
          'GoFundHer',
          '',
          // projectData.User ? projectData.User.email : ccUserData.email,
          is_recurring ? 'ReceivedMonthlyProject' : 'ReceivedOnetimeProject', {
            first_name: ccUserData ? ccUserData.first_name : 'Anonymous',
            last_name: ccUserData ? ccUserData.last_name : '',
            amount: amount,
            name: projectData ? projectData.name : '',
            donatedBy: user_id && userData ?
              [userData.first_name, userData.last_name].join(' ') :
              'Anonymous',
            comment: comment ?
              `<b>Message from your donor: </b>${comment}` :
              '',
            date: is_recurring ?
              moment()
              .add(1, 'months')
              .format('MMMM Do, YYYY') :
              null,
            comment,
          },
          true,
        );
      // }

      if (direct_donation) {
        return res.status(200).json({
          responseCode: 200,
          success: true,
        });
      } else {
        await updateProjectFund(project_id);
        return res.status(200).json({
          responseCode: 200,
          success: true,
        });
      }
    }
  } catch (error) {
    console.log(error, 'errorrrr');
    return;
  }
};

const updateProjectFund = async project_id => {
  try {
    const totalUser = await Finance.findAndCountAll({
      where: {
        project_id,
        payment_status: 'Completed',
      },
    });
    const totalAmount = await Finance.findOne({
      where: {
        project_id,
        payment_status: 'Completed',
      },
      attributes: [
        [Sequelize.fn('sum', Sequelize.col('payout_amount')), 'totalAmount'],
      ],
    });

    const projectData = await Project.findOne({
      where: {
        id: project_id,
      },
    });

    let collectedPercentage =
      (totalAmount.dataValues.totalAmount * 100) / projectData.amount;

    if (totalUser && totalAmount) {
      await Project.update({
        total_contributors: totalUser.count,
        total_pledged: totalAmount.dataValues.totalAmount,
        percentage: collectedPercentage,
      }, {
        where: {
          id: project_id,
        },
      }, );
    }
  } catch (error) {
    console.log(error);
  }
};

// paypal unsubscribe
const unsubscribeWebhookHandler = async (req, res) => {
  try {
    const {
      resource
    } = req.body;

    await RecurringDonars.update({
      is_recurring: false,
      next_donation_date: null,
    }, {
      where: {
        subscription_id: resource.id,
      },
    }, );
    return res.status(200).json({
      responseCode: 200,
      success: true,
    });
  } catch (error) {
    console.log(error, 'error');
    return;
  }
};

const payoutSuccessWebhookHandler = async (req, res) => {
  try {
    const {
      resource
    } = req.body;
    const {
      batch_header: {
        payout_batch_id
      },
    } = resource;
    await Finance.update({
      payout_succeed: 1,
    }, {
      where: {
        payout_batch_id,
      },
    }, );
  } catch (error) {
    console.log(error, 'error');
  }
};

const checkoutSession = async (req, res) => {

  return res.json({
    error: 0
  });
}

const createStripePaymentIntent = async (req, res) => {
  const {
    projectId,
    receiverId,
    userId,
    tipPrecentage,
    isSubscription,
    rewardId,
    isInfoSharable,
    comment,
    name,
    email,
    tipAmount,
    amount,
    phone
  } = req.body;

  try {
    const project = await Project.findOne({
      where: {
        id: projectId,
      },
    });

    const receiverUser = await User.findByPk(project ? project.userId : receiverId);

    const customer = await getOrCreateCustomer({
      email,
      userId
    });

    const donorUser = await User.findOne({
      where: {
        id: customer.userId,
      },
    });

    // get project donation Strip Customer Id by project user Id or receiver user Id
    const donation = await Donation.findOne({
      where: {
        user_id: project ? project.userId : receiverId,
      },
    });

    const metadata = {
      donorId: donorUser.id,
      projectId: projectId,
      receiverId: donation.user_id,
      tipPrecentage,
      tipAmount,
      isInfoSharable,
      rewardId,
      comment,
      name,
      email,
      phone
    };


    let clientSecret = null;
    if (!isSubscription) {
      clientSecret = await getStripePaymentIntentClientSecret({
        metadata,
        accountId: donation.account_id,
        amount,
        tipAmount,
        customer: customer.id
      });
    } else {
      let product = null;
      try {
        product = await stripe.products.retrieve(String(receiverUser.id));
      } catch (error) {
        product = await stripe.products.create({
          id: String(receiverUser.id),
          name: `${receiverUser.first_name} ${receiverUser.last_name}`,
          type: 'service',
        });
      }

      const items = [{
        price_data: {
          product: product.id,
          currency: 'usd',
          unit_amount: Number((amount).toFixed(2) * 100).toFixed(0),
          recurring: {
            interval: 'month',
            interval_count: 1,
          },
        }
      }];

      clientSecret = await getStripeSubscriptionClientSecret({
        metadata,
        accountId: donation.account_id,
        customer: customer.id,
        items,
        tipPrecentage
      });
    }

    return res.status(200).json({
      responseCode: 200,
      message: 'Payment intent created successfully',
      success: true,
      clientSecret
    });
  } catch (error) {
    return res.status(400).json({
      responseCode: 400,
      message: 'Error while creating payment intent',
      error: error.message,
      success: true,
      clientSecret: null
    });
  }

}
const getOrCreateCustomer = async ({
  email,
  userId
}) => {
  let user = await User.findByPk(userId);

  if (!user) {
    user = await createAnonymous();
  }

  if (user.customer_id) {
    return {
      id: user.customer_id,
      userId: user.id
    };
  }

  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId: user.id,
    },
  });

  await User.update({
    customer_id: customer.id,
  }, {
    where: {
      id: user.id,
    },
  }, );

  return {
    id: customer.id,
    userId: user.id
  };
};

const getStripeSubscriptionClientSecret = async ({
  metadata,
  accountId,
  customer,
  items,
  tipPrecentage
}) => {

  // Create the subscription. Note we're expanding the Subscription's
  // latest invoice and that invoice's payment_intent
  // so we can pass it to the front end to confirm the payment
  const subscription = await stripe.subscriptions.create({
    customer: customer,
    items,
    application_fee_percent: tipPrecentage,
    metadata,
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
    transfer_data: {
      destination: accountId
    }
  });

  return subscription.latest_invoice.payment_intent.client_secret;
}

const getStripePaymentIntentClientSecret = async ({
  metadata,
  amount,
  accountId,
  tipAmount,
  customer
}) => {
  const payload = {
    amount: (Number(amount).toFixed(2) * 100).toFixed(0),
    customer,
    currency: 'usd',
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
    application_fee_amount: Number(((tipAmount).toFixed(2) || (amount * 0.05).toFixed(2)) * 100).toFixed(0),
    transfer_data: {
      destination: accountId
    }
  };
  const paymentIntent = await stripe.paymentIntents.create(payload);

  return paymentIntent.client_secret;
}

// receive stripe webhook events
const stripeWebhookHandler = async (req, res) => {
  const {
    type,
    data
  } = req.body;

  // handle one time payment webhook
  if (['payment_intent.succeeded'].includes(type)) {
    const {
      status: paymentStatus,
      id: operationId,
      amount_received,
      application_fee_amount,
      metadata,
    } = data.object;

    if (!['succeeded', 'paid'].includes(paymentStatus) || Object.keys(metadata).length === 0) {
      return res.status(200).json({
        data: 'skip for subscription'
      });
    }

    const stripeFee = ((((2.9/100) * (amount_received/100)) + 0.30).toFixed(2) * 100).toFixed(0);

    saveStripePayment({
      ...metadata,
      operationId,
      amountReceived: amount_received - application_fee_amount - stripeFee,
      feesAmount: application_fee_amount,
      paymentStatus
    });
    return res.status(200).json({
      data: 'direct payment saved'
    });
    // handle subscription webhook
  } else if (['customer.subscription.updated'].includes(type)) {
    const {
      status: paymentStatus,
      plan: {
        amount
      },
      id: operationId,
      metadata,
    } = data.object;

    const stripeFee = (((2.9/100) * (amount/100)) + 0.30).toFixed(2) * 100;
    
    saveStripePayment({
      ...metadata,
      operationId,
      amountReceived: amount - Number(metadata.tipAmount * 100) - stripeFee,
      feesAmount: Number(metadata.tipAmount * 100),
      paymentStatus,
      isSubscription: true
    });
    return res.status(200).json({
      data: 'subscription saved'
    });
  } else if (['invoice.payment_succeeded'].includes(type)) {
    const {
      status: paymentStatus,
      subscription: operationId,
      application_fee_amount: feesAmount,
    } = data.object;

    if (!operationId) {
      return;
    }

    saveStripePayment({
      operationId,
      paymentStatus,
      isSubscription: true,
      feesAmount
    });

    return res.status(200).json({
      data: 'subscription payed'
    });
  }

  return res.status(200).json({
    data: 'unhandled event'
  });
};

// save stripe payment  to database
const saveStripePayment = async (payload) => {
  const {
    isSubscription,
    amountReceived,
    donorId,
    operationId,
    phone,
    name,
    email,
    receiverId,
    projectId,
    rewardId,
    paymentStatus,
    isInfoSharable,
    tipPrecentage,
    comment: donorCommentMessage,
    feesAmount
  } = payload;
  // check if pending subscription operation exists if so then update it and return 
  if (paymentStatus === 'paid' && isSubscription) {
    const finance = await Finance.findOne({
      where: {
        checkout_id: operationId,
        payment_status: {
          [Op.ne]: 'Completed'
        },
      }
    });
    if (!finance) {
      return;
    }
    finance.website_amount = feesAmount / 100;
    finance.amount = finance.amount - finance.website_amount;
    finance.payment_status = 'Completed';
    await finance.save();

    await RecurringDonars.update({
      tip_amount: feesAmount / 100,
    }, {
      where: {
        subscription_id: operationId
      }
    });
    return;
  }

  const donatedAmount = amountReceived / 100;
  const websiteAmount = feesAmount > 0 ? feesAmount / 100 : 0;
  // the user donating
  const donorUser = await User.findByPk(donorId);

  // the project receiving the donation
  const receiverProject = await Project.findByPk(projectId);

  // the user receiving the donation
  const receiverUser = await User.findByPk(receiverProject ? receiverProject.userId : receiverId, {
    attributes: ['email', 'first_name', 'last_name'],
  });

  if (!donorUser) {
    return;
  }

  await sendPaymentEmails({
    donorLastName: donorUser.last_name,
    donorFirstName: donorUser.first_name,
    donorEmail: donorUser.email,
    donatedAmount,
    isSubscription,
    receiverProject,
    receiverUser,
    donorCommentMessage
  });

  // Save donation to finance store    
  const financeMainData = {
    project_id: receiverProject?.id,
    profile_id: receiverId,
    direct_donation: !!projectId,
    checkout_id: operationId,
    amount: donatedAmount,
    reward_id: !!rewardId ? rewardId : null,
    transfer_id: operationId,
    status: true,
    website_amount: websiteAmount,
    payout_amount: null,
    tip_percentage: tipPrecentage,
    is_recurring: isSubscription ? 1 : 0,
    next_donation_date: isSubscription ? moment().add(1, 'months') : null,
    payment_by: 'stripe',
    payment_status: paymentStatus === 'succeeded' ? 'Completed' : 'Pending',
    comment: donorCommentMessage,
    is_info_sharable: isInfoSharable ? 1 : 0,
    full_name: name,
    email,
    phone,
    user_id: donorUser.id,
  };
  const financeStore = new Finance(financeMainData);
  const financeData = await financeStore.save();
  financeData.donation_id = `GFH-${financeData.dataValues.id.toString().padStart(5, '0')}`;

  await financeStore.save();
  if (!!projectId) {
    await updateProjectFund(projectId);
  }

  if (isSubscription) {
    await RecurringDonars.build({
      is_recurring: 1,
      user_id: donorId,
      project_id: projectId ? projectId : null,
      amount: donatedAmount,
      subscribed_by: 'stripe',
      subscription_id: operationId,
      profile_id: receiverId,
      direct_donation: projectId ? Boolean(projectId) : null,
      next_donation_date: moment().add(1, 'months'),
      tip_amount: websiteAmount,
      tip_percentage: tipPrecentage,
      is_info_sharable: isInfoSharable ? 1 : 0,
      full_name: name,
      email,
      phone,
    }).save();
  }
}

const sendPaymentEmails = async ({
  donorEmail,
  donorFirstName,
  donorLastName,
  donatedAmount,
  isSubscription = false,
  receiverProject,
  receiverUser,
  donorCommentMessage
}) => {
  try {
    // Send email to donor
    const emailData = {
      first_name: donorFirstName,
      last_name: donorLastName,
      amount: Number(donatedAmount).toFixed(2),
      date: isSubscription ? moment().add(1, 'months').format('MMMM Do, YYYY') : null,
    }
    // set name to project if exists or to receiver if not
    if (receiverProject) {
      emailData.name = receiverProject.name;
    } else {
      emailData.name = `${receiverUser.first_name} ${receiverUser.last_name}`;
    }

    new emailSender().sendMail(
      [donorEmail],
      'Thank you for Donating! ',
      ' ',
      'GoFundHer',
      '',
      isSubscription ? 'monthlyProject' : 'oneTimeProject',
      emailData,
      true,
    );
    const emailData2 = {
      first_name: receiverUser.first_name,
      last_name: receiverUser.last_name,
      amount: Number(donatedAmount).toFixed(2),
      donatedBy: `${donorFirstName} ${donorLastName}`,
      comment: donorCommentMessage ?
        `<b>Message from your donor: </b>${donorCommentMessage}` :
        '',
      date: isSubscription ? moment().add(1, 'months').format('MMMM Do, YYYY') : null,
    };
    // Send email to receiver or project owner
    if (receiverProject) {
      emailData2.name = receiverProject.name;
    }

    let receiverEmailTemplate = 'ReceivedMonthlyUser';
    if (!!receiverProject && isSubscription) {
      receiverEmailTemplate = 'ReceivedMonthlyProject';
    } else if (!!receiverProject && !isSubscription) {
      receiverEmailTemplate = 'ReceivedOnetimeProject';
    } else {
      receiverEmailTemplate = 'ReceivedOnetimeUser';
    }

    new emailSender().sendMail(
      [receiverUser.email],
      'You have received donation',
      ' ',
      'GoFundHer',
      '',
      receiverEmailTemplate,
      emailData2,
      true,
    )
  } catch (error) {
    console.log(error, 'error sending email');
  }
}

// create a paypal onboarding link
const createPaypalOnboardingLink = async (req, res) => {
  const {
    currentUser: {
      id: loggedInUserId
    }
  } = req;

  const data = await getPartnersReferralPayload({ userId: loggedInUserId })

  return res.json(data);
}

// webhook for paypal

const paypalWebhookHandler = async (req, res) => {
  const {
    body: {
      event_type,
      resource: {
        purchase_units,
        amount,
        custom: paymentCustomId,
        id: resourceId,
        // payment state
        state,
        // subscription status
        status,
        billing_agreement_id,
        custom_id: customId,
        seller_receivable_breakdown,
        merchant_id: merchantId,
        tracking_id: trackingId,
        transaction_fee
      },
    }
  } = req;
  switch(event_type) {
      // verify payment completed and amount received
      case 'CHECKOUT.ORDER.COMPLETED':
        if (typeof purchase_units === 'undefined' || purchase_units.length === 0) {
          return res.json({
            message: 'unhandled webhooks'
          });
        }
        const purchaseUnit = purchase_units[0];
        const {
          amount,
          custom_id: paymentCustomId,
          payment_instruction
        } = purchaseUnit;
        
        const platformFees = typeof payment_instruction.platform_fees !== 'undefined' ? payment_instruction.platform_fees.reduce((all, next) => all + Number(next.amount.value),0) : 0;
        const totalFees = Number(payment_instruction.paypal_fee?.value ?? 0) + platformFees;
        const donatedAmount = Number(amount.value) - totalFees;
        await Finance.update({
          payment_status: (status === 'COMPLETED') ? 'Completed' : 'Pending',
          checkout_id: resourceId,
          transfer_id: resourceId,
          payout_amount: Number(amount.value) - totalFees,
          payout_succeed: 1,
          is_recurring: billing_agreement_id ? 1 : 0,
        },{
          where: {
            donation_id: paymentCustomId
          }
        });
        const finance = await Finance.findOne({
          where: {
            donation_id: paymentCustomId
        }})
        const donorUser = await User.findOne({
          where: {
            id: finance.user_id
          }
        });

        const receiverProject = await Project.findOne({
          where: {
            id: finance.project_id
          }
        });

        const receiverUser = await User.findOne({
          where: {
            id: finance.profile_id
          }
        });
        await sendPaymentEmails({
          donorLastName: donorUser.last_name,
          donorFirstName: donorUser.first_name,
          donorEmail: finance.email,
          donatedAmount,
          isSubscription:  false,
          receiverProject,
          receiverUser,
          donorCommentMessage: finance.comment
        });
      break;
      case 'PAYMENT.SALE.COMPLETED':
        const subscription = await RecurringDonars.findOne({
          where: {
            subscription_id: billing_agreement_id
          }});
        
        const donatedAmountSubscription = Number(amount.total) - Number(transaction_fee.value) - Number(subscription.tip_amount);
        await Finance.update({
          payment_status: (state === 'completed') ? 'Completed' : 'Pending',
          checkout_id: resourceId,
          transfer_id: resourceId,
          is_recurring: billing_agreement_id ? 1 : 0,
          payout_amount: donatedAmountSubscription,
          payout_succeed: 0
        },{
          where: {
            donation_id: paymentCustomId
          }
        });
        const financeSubscription = await Finance.findOne({
          where: {
            donation_id: paymentCustomId
        }});
        if (!financeSubscription) {
          return res.json({
            message: `financeSubscription does not exist ${paymentCustomId}`
          });
        }
        const donorUserSubscription = await User.findOne({
          where: {
            id: financeSubscription.user_id
          }
        });

        const receiverProjectSubscription = await Project.findOne({
          where: {
            id: financeSubscription.project_id
          }
        });

        const receiverUserSubscription = await User.findOne({
          where: {
            id: financeSubscription.profile_id
          }
        });
        await sendPaymentEmails({
          donorLastName: donorUserSubscription.last_name,
          donorFirstName: donorUserSubscription.first_name,
          donorEmail: financeSubscription.email,
          donatedAmount: donatedAmountSubscription,
          isSubscription:  true,
          receiverProject: receiverProjectSubscription,
          receiverUser: receiverUserSubscription,
          donorCommentMessage: financeSubscription.comment
        });
      break;
    // handle subscription status
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
      await RecurringDonars.update({
        subscription_id: resourceId,
        is_recurring: status === 'ACTIVE' ? 1 : 0,
      },{
        where: {
          subscription_id: {
            [Op.or]: {
              [Op.eq]: customId,
              [Op.eq]: resourceId,
            },
          },
        }
      });
      break;
    case 'BILLING.SUBSCRIPTION.CANCELLED':
        await RecurringDonars.update({
          is_recurring: false,
          next_donation_date: null,
        }, {
          where: {
            subscription_id: resourceId,
          },
        });
    // user onboarding completed
    case 'MERCHANT.ONBOARDING.COMPLETED':
      const donation = await Donation.count({
        where: {
          user_id: trackingId
        }
      });

      if (!donation) {
      await Donation.create({
          user_id: trackingId,
        });
      }

      await Donation.update({
        paypal_merchant_id: merchantId,
        paypal_onboarding_status: 'ACTIVE'
      }, {
        where:{
          user_id: trackingId
        }
      })
     
        await User.update({
          is_paypal_connected: 1,
        }, {
          where: {
            id: trackingId
          }
        })
    break;
    // handle partner consent revoked
    case 'MERCHANT.PARTNER-CONSENT.REVOKED':
      await Donation.update({
        paypal_merchant_id: null,
        paypal_onboarding_status: 'DECLINED'
      }, {
        where:{
          user_id: trackingId
        }
      })
     
        await User.update({
          is_paypal_connected: 0,
        }, {
          where: {
            id: trackingId
          }
        })
    break;
  }

  return res.json({
    message: 'unhandled webhooks'
  });
}

const paypalOnboardingReturnHandler = async (req, res) => {
  const {
    merchantIdInPayPal
  } = req.query;

  try {
    const {
      body: {
        payments_receivable,
        primary_email_confirmed,
        tracking_id,
        merchant_id
      }
    } = await paypalGetRequest(`/v1/customer/partners/${process.env.PAYPAL_BUSINESS_MERCHANT_ID}/merchant-integrations/${merchantIdInPayPal}`)
      

    const user = await User.findByPk(tracking_id);

    let donation;

    if (user) {
      donation = await Donation.findOne({
        where: {
          user_id: user.id,
        }
      });

      if (!donation) {
        donation = await Donation.create({
          user_id: userData.userId,
        }, {
          returning: true,
        });
      }

      donation.paypal_merchant_id = merchant_id;
      if (payments_receivable && primary_email_confirmed) {
        donation.paypal_onboarding_status = 'ACTIVE';
        await User.update({
          is_paypal_connected: 1,
        }, {
          where: {
            id: user.id,
          }
        })
      }
      await donation.save();
    }
  } catch (error) {}

  return res.redirect(`${FrontendUrl}/get-paid-now`);
}

const updateSubscriptionOrder = async (req, res) => {
  const {
    subscriptionID,
    orderID,
    donationId
  } = req.body;
  await Finance.update({
    transfer_id: orderID,
    checkout_id: orderID
  }, {
    where: {
      donation_id: donationId,
    }
  });
  await RecurringDonars.update({
    subscription_id: subscriptionID,
  }, {
    where: {
      subscription_id: donationId,
    }
  });

  return res.json({
    responseCode: 400,
    message: 'subscription updated successfully',
    success: true,
  })
}

const createPaypalOrder = async (req, res) => {
  const {
    isSubscription,
    subscriptionID,
    orderID,
    userId,
    phone,
    name,
    email,
    receiverId,
    projectId,
    amount,
    rewardId,
    tipAmount,
    isInfoSharable,
    tipPrecentage,
    comment: donorCommentMessage,
  } = req.body;


  // the user donating
  let donorUser = await User.findByPk(userId);

  if (!donorUser) {
    donorUser = await createAnonymous();
  }

  // the project receiving the donation
  const receiverProject = await Project.findByPk(projectId);

  // the user receiving the donation
  const receiverUser = await User.findByPk(receiverProject ? receiverProject.userId : receiverId, {
    attributes: ['email', 'first_name', 'last_name', 'id', 'is_paypal_connected'],
  });
  // receiver user donation data
  const donation = await Donation.findOne({
    where: {
      user_id: receiverUser.id,
    },
  });
  // !receiverUser.is_paypal_connected)
  if (!donation || !donation.paypal_merchant_id) {
    return res.status(400).json({
      responseCode: 400,
      message: 'failed creating the order',
      success: false
    });
  }
  // Save donation to finance store    
  const financeMainData = {
    project_id: receiverProject?.id,
    profile_id: receiverId,
    direct_donation: projectId ? Boolean(projectId) : 0,
    amount: amount,
    reward_id: !!rewardId ? rewardId : null,
    status: true,
    website_amount: tipAmount,
    payout_amount: amount - tipAmount,
    checkout_id: isSubscription ? subscriptionID : orderID,
    transfer_id: isSubscription ? subscriptionID : orderID,
    tip_percentage: tipPrecentage,
    is_recurring: 0,
    next_donation_date: isSubscription ? moment().add(1, 'months') : null,
    payment_by: 'paypal',
    payment_status: 'Pending',
    comment: donorCommentMessage,
    is_info_sharable: isInfoSharable ? 1 : 0,
    full_name: name,
    email,
    phone,
    user_id: donorUser.id,
  };

  const financeStore = new Finance(financeMainData);
  const financeData = await financeStore.save();
  const donationId = `GFH-${financeData.dataValues.id.toString().padStart(5, '0')}`;
  financeData.donation_id = donationId;

  await financeStore.save();
  if (!!projectId) {
    await updateProjectFund(projectId);
  }

  if (isSubscription) {
    await RecurringDonars.build({
      is_recurring: 0,
      user_id: userId,
      project_id: projectId ? projectId : null,
      amount: amount,
      subscribed_by: 'paypal',
      subscription_id: donationId,
      profile_id: receiverId,
      direct_donation: projectId ? Boolean(projectId) : 0,
      next_donation_date: moment().add(1, 'months'),
      tip_amount: tipAmount,
      tip_percentage: tipPrecentage,
      is_info_sharable: isInfoSharable ? 1 : 0,
      full_name: name,
      email,
      phone,
    }).save();

    return res.status(200).json({
      responseCode: 200,
      message: 'subscription created',
      success: true,
      data: donationId
    });
  }
  
  let orderId = null;

  if (donation.paypal_merchant_id) {
    orderId = await getPaypalOrderId({
      merchantId: donation.paypal_merchant_id,
      amount,
      customId: donationId,
      platformFee: tipAmount
    });
  } else {
    orderId = await getEmailPaypalOrderId({
      amount,
      customId: donationId
    });
}

  return res.status(200).json({
    responseCode: 200,
    message: 'paypal order created',
    success: true,
    data: orderId,
    merchantId: donation.paypal_merchant_id
  });
}

module.exports = {
  UnSubscribeRecurringPayment,
  recurringChargeWebhook,
  onSubscribePaypalPlan,
  updatePaymentStatus,
  paypalWebhooks,
  checkoutSession,
  createStripePaymentIntent,
  stripeWebhookHandler,
  createPaypalOnboardingLink,
  paypalWebhookHandler,
  paypalOnboardingReturnHandler,
  createPaypalOrder,
  updateSubscriptionOrder
};