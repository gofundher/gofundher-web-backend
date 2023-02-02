/** @format */

const moment = require('moment');
const Sequelize = require('sequelize');
const excel = require('node-excel-export');
const Op = Sequelize.Op;
const { Donation, Finance, Project, User } = require('../../models');
const emailSender = require('../../helpers/mailSender');

const getDonations = async (req, res) => {
  try {
    const {
      query: { limit, page, search, searchByStatus, searchPaymentBy },
    } = req;

    const paymentBy = ['paypal', 'stripe'].includes(searchPaymentBy) ? searchPaymentBy : null;

    let pageLimit = parseInt(limit) || 50; // data limit
    let pageNumber = parseInt(page) || 1; // page number
    let offset = pageLimit * (pageNumber - 1); // skip value\
    let condition = {
      payment_status: 'Completed',
    };

    let projectCondition = null;
    if (search) {
      projectCondition = {
        name: {
          [Op.like]: `%${search}%`,
        },
      };
    }
    if (paymentBy != null && paymentBy !== '') {
      condition.payment_by = paymentBy;
    }
    if (searchByStatus != null && searchByStatus !== '' && searchPaymentBy !== 'stripe') {
      condition.payout_succeed = searchByStatus;
    }
    const data = await Finance.findAndCountAll({
      where: condition,
      attributes: {
        include: [
          [
            Sequelize.literal(
              `(CASE WHEN project_id is null then profile_id ELSE (SELECT userId FROM Projects mi WHERE mi.id = project_id) END)`,
            ),
            'fundraiser_id',
          ],
        ],
      },
      include: [
        {
          model: Project,
          where: projectCondition,
          // include:{
          //     model:User
          // },
          attributes: ['name', 'id', 'url'],
        },
        {
          model: User,
          attributes: ['first_name', 'last_name'],
        },
      ],
      order: [['createdAt', 'DESC']],
      offset: offset,
      limit: pageLimit,
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
            attributes: ['first_name', 'last_name', 'email'],
            include: {
              model: Donation,
            },
          });
          result.push({ ...element, fundRaiserInfo });
        } else {
          result.push(element);
        }
      }
    }
    return res.status(200).json({
      responseCode: 200,
      data: { count: data.count, rows: result },
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message ? error.message : 'Unexpected error occur.',
      success: false,
    });
  }
};

const updatePayoutStatus = async (req, res) => {
  try {
    const {
      body: {
        donationId,
        transactionId,
        note,
        fundRaiserDetails,
        amount,
        paymentMode,
        directDonation,
        project,
      },
    } = req;
    await Finance.update(
      {
        payout_succeed: true,
        transfer_id: transactionId,
        transferred_amount: amount,
        transferred_via: paymentMode,
        note,
      },
      {
        where: {
          donation_id: donationId,
        },
      },
    );
    // new emailSender().sendMail(
    //   [fundRaiserDetails.email],
    //   'Transfer Successful',
    //   ' ',
    //   'GoFundHer',
    //   ' ',
    //   'transferSuccess',
    //   {
    //     first_name: fundRaiserDetails.first_name,
    //     last_name: fundRaiserDetails.last_name,
    //     amount,
    //     transaction_id: transactionId,
    //     transferred_via:
    //       paymentMode === 'mobileNumber' ? 'Mobile number' : paymentMode,
    //     name: directDonation ? 'profile' : project,
    //     note: note ? `<b>Note: </b>${note}` : '',
    //   },
    //   true,
    // );
    return res.status(200).json({
      responseCode: 200,
      message: 'Status updated successfully',
      // data:{count:data.count, rows:result},
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message ? error.message : 'Unexpected error occur.',
      success: false,
    });
  }
};

const exportReport = async (req, res) => {
  const styles = {
    headerDark: {
      fill: {
        fgColor: {},
      },
      font: {
        color: {
          rgb: 'FFFFFFFF',
        },
        sz: 12,
        bold: true,
        fontfamily: 'Times New Roman',
      },
    },
  };
  //Here you specify the export structure
  const specification = {
    id: {
      // <- the key should match the actual data key
      displayName: '#', // <- Here you specify the column header
      headerStyle: styles.headerDark, // <- Header style
      width: 70, // <- width in pixels
    },
    fundraiserName: {
      displayName: 'Fundraiser Name',
      headerStyle: styles.headerDark,
      width: 70, // <- width in chars (when the number is passed as string)
    },
    fundraiserEmail: {
      displayName: 'Fundraiser email',
      headerStyle: styles.headerDark,
      width: 70,
    },
    fundraiserPaypalEmail: {
      displayName: 'Fundraiser Paypal email',
      headerStyle: styles.headerDark,
      width: 220,
    },
    fundraiserPaypalMobile: {
      displayName: 'Fundraiser Paypal mobile',
      headerStyle: styles.headerDark,
      width: 220,
    },
    fundRaiserAccountNo: {
      displayName: 'Fundraiser Account No.',
      headerStyle: styles.headerDark,
      width: 120,
    },
    fundRaiserRoutingNo: {
      displayName: 'Fundraiser Routing No.',
      headerStyle: styles.headerDark,
      width: 220,
    },
    projectName: {
      displayName: 'Funded Project',
      headerStyle: styles.headerDark,
      width: 220,
    },
    profile: {
      displayName: 'Funded Profile',
      headerStyle: styles.headerDark,
      width: 120,
    },
    amount: {
      displayName: 'Amount',
      headerStyle: styles.headerDark,
      width: 70,
    },
    platformFee: {
      displayName: 'Platform Fee',
      headerStyle: styles.headerDark,
      width: 180,
    },
    transferAmount: {
      displayName: 'Transfer Amount',
      headerStyle: styles.headerDark,
      width: 180,
    },
    status: {
      displayName: 'Payout Status',
      headerStyle: styles.headerDark,
      width: 180,
    },
    paymentDate: {
      displayName: 'Payment Date',
      headerStyle: styles.headerDark,
      width: 180,
    },
  };
  let condition = {
    payment_by: 'paypal',
    payment_status: 'Completed',
  };
  const data = await Finance.findAndCountAll({
    where: condition,
    attributes: {
      include: [
        [
          Sequelize.literal(
            `(CASE WHEN project_id is null then profile_id ELSE (SELECT userId FROM Projects mi WHERE mi.id = project_id) END)`,
          ),
          'fundraiser_id',
        ],
      ],
    },
    include: [
      {
        model: Project,
        attributes: ['name', 'id', 'url'],
      },
      {
        model: User,
        attributes: ['first_name', 'last_name'],
      },
    ],
    order: [['createdAt', 'DESC']],
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
          attributes: ['first_name', 'last_name', 'email'],
          include: {
            model: Donation,
          },
        });
        result.push({ ...element, fundRaiserInfo });
      } else {
        result.push(element);
      }
    }
  }
  const dataset = [];
  for (let i = 0; i < result.length; i++) {
    const {
      fundRaiserInfo,
      direct_donation,
      Project,
      amount,
      website_amount,
      payout_amount,
      createdAt,
      payout_succeed,
    } = result[i];
    let tempObj;
    if (fundRaiserInfo) {
      tempObj = {
        id: i + 1,
        fundraiserName:
          [fundRaiserInfo.first_name, fundRaiserInfo.last_name].join(' ') ||
          '-',
        fundraiserEmail: fundRaiserInfo.email || '-',
        fundraiserPaypalEmail: fundRaiserInfo.Donation
          ? fundRaiserInfo.Donation.paypal_email || '-'
          : '-',
        fundraiserPaypalMobile: fundRaiserInfo.Donation
          ? fundRaiserInfo.Donation.paypal_mobile || '-'
          : '-',
        fundRaiserAccountNo: fundRaiserInfo.Donation
          ? fundRaiserInfo.Donation.account_number || '-'
          : '-',
        fundRaiserRoutingNo: fundRaiserInfo.Donation
          ? fundRaiserInfo.Donation.routing_number || '-'
          : '-',
      };
    }
    tempObj = {
      ...tempObj,
      projectName: direct_donation ? '-' : Project && Project.name,
      profile: direct_donation
        ? [fundRaiserInfo.first_name, fundRaiserInfo.last_name].join(' ') || '-'
        : '-',
      amount: amount
        ? new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(amount)
        : '$0.00',
      platformFee: website_amount
        ? new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(website_amount)
        : '$0.00',
      transferAmount: payout_amount
        ? new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(payout_amount)
        : '$0.00',
      paymentDate: createdAt ? moment(createdAt).format('MMM DD, YYYY') : '-',
      status: payout_succeed ? 'Paid' : 'Unpaid',
    };
    dataset.push(tempObj);
  }
  const report = excel.buildExport([
    // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
    {
      name: 'Report',
      specification: specification, // <- Report specification
      data: dataset, // <-- Report data
    },
  ]);
  // You can then return this straight
  // res.attachment(moment().format('YYYY_MM_DD') + '_student_report.xlsx'); // This is sails.js specific (in general you need to set headers)
  return res.status(200).send(report);
};

module.exports = {
  getDonations,
  updatePayoutStatus,
  exportReport,
};
