/** @format */

const moment = require('moment');
const Sequelize = require('sequelize');
const excel = require('node-excel-export');
const Op = Sequelize.Op;
const { sequelize, Donation, Finance, Project, User } = require('../../models');
const emailSender = require('../../helpers/mailSender');

const getDonations = async (req, res) => {
  try {
    const {
      query: { limit, page, search, searchByStatus, searchPaymentBy, order_field, order_dir },
    } = req;

    const paymentBy = ['paypal', 'stripe'].includes(searchPaymentBy) ? searchPaymentBy : null;

    let pageLimit = parseInt(limit) || 50; // data limit
    let pageNumber = parseInt(page) || 1; // page number
    let offset = pageLimit * (pageNumber - 1); // skip value\

    let where = " WHERE payment_status = 'Completed' AND";

    if (search) {
      where += " `Project.name` LIKE '%" + search + "%' AND ";
    }
    if (paymentBy != null && paymentBy !== '') {
      where += " payment_by = '" + paymentBy + "' AND ";
    }
    if (searchByStatus != null && searchByStatus !== '' && searchPaymentBy !== 'stripe') {
      where += " payout_succeed = '" + searchByStatus + "' AND ";
    }

    where = where.substring(0, where.length - 4);

    let order = null;
    if (order_field == 'project') {
      // order = [[{ model: Project }, 'name', order_dir]]
      order = "ORDER BY `Project.name` " + order_dir;
    }
    else if (order_field == 'profile') {
      // order = [[{ model: User }, 'first_name', order_dir]]
      order = "ORDER BY `fundRaiser_first_name` " + order_dir;
    } else if (order_field == null) {
      // order = [['createdAt', 'DESC']];
      order = "ORDER BY createdAt " + order_dir;
    } else {
      // order = [[order_field, order_dir]];
      order = "ORDER BY " + order_field + " " + order_dir;
    }

    /*
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
      order: order,
      offset: offset,
      limit: pageLimit,
    });
    */
    const subquery =
      `SELECT
      Finance.id,
      Finance.user_id,
      Finance.full_name,
      Finance.email,
      Finance.phone,
      Finance.is_info_sharable,
      Finance.checkout_id,
      Finance.is_recurring,
      Finance.next_donation_date,
      Finance.website_amount,
      Finance.tip_percentage,
      ( Finance.amount - Finance.website_amount ) * 0.05 AS tip_amount,
      Finance.donation_id,
      Finance.project_id,
      Finance.amount,
      Finance.payout_amount,
      Finance.transferred_amount,
      Finance.transferred_via,
      Finance.transfer_id,
      Finance.reward_id,
      Finance.status,
      Finance.profile_id,
      Finance.direct_donation,
      Finance.payment_by,
      Finance.payment_status,
      Finance.payout_succeed,
      Finance.note,
      Finance.webhook_event_id,
      Finance.comment,
      Finance.createdAt,
      Finance.updatedAt,
      
      IF( Finance.project_id IS NULL, ProfileUsers.id, Project.u_id ) AS fundraiser_id,
      IF( Finance.project_id IS NULL, ProfileUsers.first_name, Project.u_first_name ) AS fundraiser_first_name,
      IF( Finance.project_id IS NULL, ProfileUsers.last_name, Project.u_last_name ) AS fundraiser_last_name,
      IF( Finance.project_id IS NULL, ProfileUsers.email, Project.u_email ) AS fundraiser_email,
      IF( Finance.project_id IS NULL, ProfileUsers.profileUrl, Project.u_profileUrl ) AS fundraiser_profileUrl,
      IF( Finance.project_id IS NULL, ProfileUsers.is_acc_updated, Project.u_is_acc_updated ) AS fundraiser_is_acc_updated,
      IF( Finance.project_id IS NULL, ProfileUsers.is_paypal_connected, Project.u_is_paypal_connected ) AS fundraiser_is_paypal_connected,
      
      Project.id AS 'Project.id',
      Project.name AS 'Project.name',
      Project.url AS 'Project.url',
      User.id AS 'User.id',
      User.first_name AS 'User.first_name',
      User.last_name AS 'User.last_name',
      User.profileUrl AS 'User.profileUrl' 
    FROM
      Finances AS Finance
      LEFT JOIN (
      SELECT
        tt0.id,
        tt0.name,
        tt0.url,
        tt1.id AS u_id,
        tt1.first_name AS u_first_name,
        tt1.last_name AS u_last_name,
        tt1.email AS u_email,
        tt1.profileUrl AS u_profileUrl,
        tt1.is_acc_updated AS u_is_acc_updated,
        tt1.is_paypal_connected  AS u_is_paypal_connected
      FROM
        Projects AS tt0
        LEFT JOIN Users AS tt1 ON tt0.userId = tt1.id 
      ) AS Project ON Finance.project_id = Project.id
      LEFT JOIN Users AS User ON Finance.user_id = User.id
      LEFT JOIN Users AS ProfileUsers ON Finance.profile_id = ProfileUsers.id `;

    const [tmp] = await sequelize.query(
      `SELECT
          COUNT(*) AS total 
        FROM(` + subquery + `) t0 ` + where + " ");

    console.log("------------ total -----------");
    const total = tmp[0].total;
    console.log(tmp[0].total);

    const [rows] = await sequelize.query(
      `SELECT t0.* FROM (` + subquery + `) t0 ` + where + " " + order + " LIMIT " + offset + ", " + pageLimit);

    let data = { count: total, rows: rows };
    let result = [];
    if (data && data.rows && data.rows.length) {
      for (let index = 0; index < data.rows.length; index++) {
        let element = data.rows[index];
        if (element.fundraiser_id) {
          /*
          let fundRaiserInfo = await User.findOne({
            where: {
              id: element.fundraiser_id,
            },
            attributes: ['id', 'first_name', 'last_name', 'email', 'profileUrl', 'is_acc_updated', 'is_paypal_connected'],
            include: {
              model: Donation,
            },
          });
          */

          let donation = await Donation.findOne({
            where: {
              user_id: element.fundraiser_id,
            },
          });
          result.push({
            ...element,
            fundRaiserInfo: {
              id: element['fundraiser_id'],
              first_name: element['fundraiser_first_name'],
              last_name: element['fundraiser_last_name'],
              email: element['fundraiser_email'],
              profileUrl: element['fundraiser_profileUrl'],
              is_acc_updated: element['fundraiser_is_acc_updated'],
              is_paypal_connected: element['fundraiser_is_paypal_connected'],
              Donation: donation
            },
            Project: {
              id: element['Project.id'],
              name: element['Project.name'],
              url: element['Project.url']
            },
            User: {
              id: element["User.id"],
              first_name: element["User.first_name"],
              last_name: element["User.last_name"],
            }
          });
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

const getMonthlyDonations = async (req, res) => {
  try {
    const {
      query: { limit, page, search, searchByStatus, searchPaymentBy, order_field, order_dir },
    } = req;

    const paymentBy = ['paypal', 'stripe'].includes(searchPaymentBy) ? searchPaymentBy : null;

    let pageLimit = parseInt(limit) || 50; // data limit
    let pageNumber = parseInt(page) || 1; // page number
    let offset = pageLimit * (pageNumber - 1); // skip value\

    let where = " is_recurring = 1 AND payment_status = 'Completed' AND";
    let where_t0 = "";
    if (search) {
      where_t0 = " WHERE (project_name LIKE '%" + search + "%' OR payer_name LIKE '%" + search + "%' OR receiver_name LIKE '%" + search + "%') AND ";
    }

    if (paymentBy != null && paymentBy !== '') {
      where += " payment_by = '" + paymentBy + "' AND ";
    }
    if (searchByStatus != null && searchByStatus !== '' && searchPaymentBy !== 'stripe') {
      where += " payout_succeed = '" + searchByStatus + "' AND ";
    }

    where = where.substring(0, where.length - 4);
    where_t0 = where_t0.substring(0, where_t0.length - 4);

    let order = null;
    if (order_field == null) {
      // order = [['createdAt', 'DESC']];
      order = "ORDER BY end_date DESC ";
    } else {
      // order = [[order_field, order_dir]];
      order = "ORDER BY " + order_field + " " + order_dir;
    }
    const subquery =
      `SELECT
            user_id, project_id, null as profile_id, payment_by,
            start_date, end_date, amount, website_amount,
            tip_amount, payout_amount,
            1 AS is_project,
            CONCAT(t1.first_name, ' ', t1.last_name) AS payer_name,
            t2.name AS project_name,
            t2.url AS project_url,
            CONCAT(t2.first_name, ' ', t2.last_name) AS receiver_name
          FROM
            (
            SELECT
              user_id, project_id, payment_by,
              MIN( createdAt) AS start_date,
              MAX( createdAt) AS end_date,
              SUM( amount ) AS amount,
              SUM( website_amount ) AS website_amount,
              SUM( amount - website_amount )* 0.05 AS tip_amount,
              SUM( payout_amount ) AS payout_amount 
          FROM
            Finances 
          WHERE NOT ISNULL(project_id) AND ` + where + `
          GROUP BY user_id, project_id, payment_by) t0
          LEFT JOIN Users t1 ON t0.user_id = t1.id
          LEFT JOIN 
            (SELECT 
                Projects.id, 
                Projects.name, 
								Projects.url,
                userId, 
                Users.first_name, 
                Users.last_name 
              FROM Projects 
              LEFT JOIN Users ON Projects.userId = Users.id) t2 ON t0.project_id = t2.id 
        UNION(
          SELECT
              user_id, null as project_id, profile_id, payment_by,
              start_date, end_date, amount, website_amount,
              tip_amount, payout_amount,
              0 AS is_project,
              CONCAT(t1.first_name, ' ', t1.last_name) AS payer_name,
              CONCAT(t2.first_name, ' ', t2.last_name) AS project_name,
              t2.profileUrl AS project_url,
              CONCAT(t2.first_name, ' ', t2.last_name) AS receiver_name
            FROM
              (
              SELECT
                user_id, profile_id, payment_by,
                MIN( createdAt) AS start_date,
                MAX( createdAt) AS end_date,
                SUM( amount ) AS amount,
                SUM( website_amount ) AS website_amount,
                SUM( amount - website_amount )* 0.05 AS tip_amount,
                SUM( payout_amount ) AS payout_amount 
            FROM
              Finances 
            WHERE NOT ISNULL(profile_id) AND ` + where + `
            GROUP BY user_id, profile_id, payment_by) t0
            LEFT JOIN Users t1 ON t0.user_id = t1.id
            LEFT JOIN Users t2 ON t0.profile_id = t2.id 
        )`;

    const [tmp] = await sequelize.query(
      `SELECT COUNT(*) FROM(` + subquery + `) tt0` + where_t0);

    console.log("------------ total -----------");
    const total = tmp[0].total;
    console.log(tmp);

    const [rows] = await sequelize.query(
      `SELECT * FROM(` + subquery + `) tt0` + where_t0 + " " + order + " LIMIT " + offset + ", " + pageLimit);

    return res.status(200).json({
      responseCode: 200,
      data: { count: total, rows: rows },
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
  getMonthlyDonations,
  updatePayoutStatus,
  exportReport,
};
