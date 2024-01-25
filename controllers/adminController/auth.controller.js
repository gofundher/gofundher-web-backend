'use strict';

const { Admin, Project, User, Comment, Finance, RecurringDonars, sequelize } = require('../../models');
const { validationResult } = require('express-validator/check');
const { secret, stripe_private_key } = require('./../../constants/index');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const salt = bcrypt.genSaltSync(10);
const stripe = require('stripe')(stripe_private_key);
stripe.setApiVersion('2020-08-27'); // SET API VERSION
const path = require('path');
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../../config/server-config.json')[env];
const emailSender = require('../../helpers/mailSender');
const __basedir = path.join(__dirname, '../public');
var Sequelize = require('sequelize');
const { recurringDonars } = require('../user.controller');

// admin login
const adminLogin = async (req, res) => {
  try {
    const data = req.body;
    const userRec = await Admin.findOne({
      where: {
        email: data.email,
      },
    });
    if (!userRec) {
      return res.status(401).json({
        responseCode: 401,
        message: 'Provided Email is not registered with us',
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
        message: 'Incorrect Email id & password',
        success: false,
      });
    }
    const token = jwt.sign(
      {
        id: userRec.id,
        email: userRec.email,
        randomKey: salt,
      },
      secret,
      {
        expiresIn: 86400,
      }
    );
    return res.status(200).json({
      responseCode: 200,
      data: userRec,
      token: token,
      message: 'Welcome to the admin section of CashFundHer.',
      success: true,
    });
  } catch (error) {
    return res.status(400).json({
      responseCode: 400,
      message: 'Error while login user!',
      error: error,
      success: false,
    });
  }
};
//admin login api ends
//view api
const view = async (req, res) => {
  try {
    const result = await Admin.findOne({
      where: { id: req.query.id },
    });

    if (result == null) {
      return res.status(400).json({
        responseCode: 400,
        message: 'Data not found',
        success: true,
      });
    }

    return res.status(200).json({
      responseCode: 200,
      data: result,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message ? error.message : 'Unexpected error occure.',
      success: false,
    });
  }
};

/* ---------- Get All Projects Detail --------- */
const getProjects = async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 5;
  const page = req.query.page ? parseInt(req.query.page) : 1;
  const skip = (page - 1) * limit;
  let searchValue = req.query.search ? req.query.search : null;
  let searchByStatus = req.query.searchByStatus
    ? req.query.searchByStatus
    : null;
  let category = req.query.category ? req.query.category : null;
  let filter = req.query.filter ? req.query.filter : null;
  let order_field = req.query.order_field ? req.query.order_field : 'createdAt';
  let order_dir = req.query.order_dir ? req.query.order_dir : 'desc';

  try {
    const queryParams = req.query;
    // page number is required
    if (!queryParams.page || parseInt(queryParams.page) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: 'Page not provided or incorrect',
        success: false,
      });
    }

    // limit is required
    if (!queryParams.limit || parseInt(queryParams.limit) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: 'Limit not provided or incorrect',
        success: false,
      });
    }

    const Op = Sequelize.Op;
    let condition = {
      is_deleted: {
        [Op.ne]: true,
      },
    };
    if (searchValue) {
      condition = {
        [Op.or]: [
          {
            name: {
              [Op.like]: '%' + searchValue.trim() + '%',
            },
          },
          {
            description: {
              [Op.like]: '%' + searchValue.trim() + '%',
            },
          },
          {
            punch_line: {
              [Op.like]: '%' + searchValue.trim() + '%',
            },
          },
          {
            project_location: {
              [Op.like]: '%' + searchValue.trim() + '%',
            },
          },
          // Sequelize.where(
          //   Sequelize.col("User.first_name"),
          //   { [Op.like]: "%" + searchValue.trim() + "%" } || ""
          // ),
          // Sequelize.where(
          //   Sequelize.col("User.last_name"),
          //   { [Op.like]: "%" + searchValue.trim() + "%" } || ""
          // ),
          Sequelize.where(
            Sequelize.fn(
              'concat',
              Sequelize.col('User.first_name'),
              ' ',
              Sequelize.col('User.last_name')
            ),
            {
              [Op.like]: '%' + searchValue.trim() + '%',
            }
          ),

          Sequelize.where(
            Sequelize.col('User.email'),
            { [Op.like]: '%' + searchValue.trim() + '%' } || ''
          ),
        ],
      };
    }
    if (searchByStatus != null) {
      condition.status = searchByStatus;
    }
    if (category != null) {
      condition.category = category;
    }
    if (filter != null) {
      condition.isFeatured = filter;
    }
    const result = await Project.findAll({
      where: [{
        ...condition,
        is_deleted: {
          [Op.ne]: true,
        },
      }],
      include: [
        User,
      ] /* [
       { model: User,
        attributes:[]}
      ], */,
      order: [[order_field, order_dir]],
      offset: skip,
      limit: limit,
      attributes: [
        'id',
        'name',
        'url',
        'punch_line',
        'category',
        'amount',
        'deadline',
        'userId',
        'location',
        'status',
        'project_location',
        'percentage',
        'total_contributors',
        'total_pledged',
        'featured_image',
        'thumbnail_image',
        'createdAt',
        'updatedAt',
        'isFeatured',
      ],
    });

    const totalCount = await Project.count({
      where: [{ ...condition }],
      include: [User],
    });

    if (result == null) {
      return res.status(400).json({
        responseCode: 400,
        message: 'No user found.',
        success: false,
      });
    }
    let pages = Math.ceil(totalCount / limit);
    return res.status(200).json({
      responseCode: 200,
      data: result,
      offset: skip,
      totalPages: pages,
      totalCount: totalCount,
      message: 'Details of all the users.',
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message ? error.message : 'Unexpected error occur.',
      success: false,
    });
  }
};

const deleteProject = async (req, res) => {
  const { body } = req;
  const { id } = body;
  console.log(id);

  try {
    await Project.update(
      {
        is_deleted: true,
      },
      {
        where: {
          id: id,
        },
      }
    );
    return res.status(200).json({
      responseCode: 200,
      message: 'Project deleted successfully',
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: error.message
        ? error.message
        : 'We are fetching some problem, try again after some time.',
      success: false,
    });
  }
};

//changeProjectStatus start here
const changeProjectStatus = async (req, res) => {
  try {
    const { body } = req;
    const { projectId, status } = body;
    if (!projectId) {
      return res.status(400).json({
        responseCode: 400,
        message: 'Project ids not provided',
        success: false,
      });
    }
    await Project.update(
      {
        status: status,
      },
      {
        where: {
          id: projectId,
        },
      }
    );
    return res.status(200).json({
      responseCode: 200,
      message: 'status update successfully',
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: error.message
        ? error.message
        : 'We are fetching some problem, try again after some time.',
      success: false,
    });
  }
};

/* -------- get All Users ------ */
const getUsers = async (req, res) => {
  const limit = parseInt(req.query.limit) ? parseInt(req.query.limit) : 10;
  const page = parseInt(req.query.page) ? parseInt(req.query.page) : 1;
  const skip = (page - 1) * limit;
  let searchValue = req.query.search ? req.query.search : null;
  let searchByStatus = req.query.searchByStatus
    ? req.query.searchByStatus
    : null;
  let filter = req.query.filter ? req.query.filter : null;
  let order_field = req.query.order_field ? req.query.order_field : null;
  let order_dir = req.query.order_dir ? req.query.order_dir : null;

  try {
    const queryParams = req.query;

    if (!queryParams.page || parseInt(queryParams.page) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: 'Page not provided or incorrect',
        success: false,
      });
    }

    // limit is required
    if (!queryParams.limit || parseInt(queryParams.limit) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: 'Limit not provided or incorrect',
        success: false,
      });
    }

    const Op = Sequelize.Op;
    let condition = {
      is_deleted: {
        [Op.ne]: true,
      },
    };
    let where = "anonymousUser = 0 AND is_deleted = 0 AND ";
    let condition1 = {};

    condition1.anonymousUser = 0;

    if (searchValue) {
      condition = {
        [Op.or]: [
          Sequelize.where(
            Sequelize.fn(
              'concat',
              Sequelize.col('first_name'),
              ' ',
              Sequelize.col('last_name')
            ),
            {
              [Op.like]: '%' + searchValue.trim() + '%',
            }
          ),
          {
            email: {
              [Op.like]: '%' + searchValue.trim() + '%',
            },
          },
        ],
      };

      where += " (email LIKE '%" + searchValue + "%' OR first_name LIKE '%" + searchValue + "%' OR last_name LIKE '%" + searchValue + "%') AND ";
    }
    console.log('filter', filter);

    if (searchByStatus != null) {
      condition.isActive = searchByStatus;
      where += " isActive = " + searchByStatus + " AND ";
    }
    if (filter != null) {
      condition.isFeatured = filter;
      where += " isFeatured = " + filter + " AND ";
    }
    console.log('condition.isFeatured', condition.isFeatured);

    where = where.substring(0, where.length - 4);
    const [result, metadata] = await sequelize.query("select t0.*, t1.project_count, t1.total_pledged, t2.personal_donation from Users t0 left join (select userId, count(id) as project_count, sum(amount) as amount, sum(total_pledged) as total_pledged from Projects group by userId) t1 on t0.id = t1.userId left join (select profile_id, sum(payout_amount) as personal_donation from Finances group by profile_id) t2 on t0.id = t2.profile_id WHERE " + where + " ORDER BY " + order_field + " " + order_dir + " limit " + skip + "," + limit);

    /*
        const result = await User.findAll({
          where: [{ ...condition, ...condition1 }],
          include: [
            {
              model: Project,
              attributes: [
                'userId',
                'total_pledged',
                //   [
                //     Sequelize.fn("sum", Sequelize.col("total_pledged")),
                //     "TotalAmount"
                //   ],
                //   [Sequelize.fn("count", Sequelize.col("userId")), "Totalprojects"]
              ],
            },
            {
              model: Finance,
              attributes: ['profile_id', 'amount', 'payout_amount'],
              where: {
                payment_status: 'Completed',
              },
              required: false,
            },
          ],
          order: [['createdAt', 'DESC']],
          offset: skip,
          limit: limit,
        });
    */
    const totalCount = await User.count({
      where: [{ ...condition, ...condition1 }],
    });
    if (result == null) {
      return res.status(400).json({
        responseCode: 400,
        message: 'No user found.',
        success: false,
      });
    }
    let pages = Math.ceil(totalCount / limit);
    return res.status(200).json({
      responseCode: 200,
      data: result,
      offset: skip,
      totalPages: pages,
      totalCount: totalCount,
      message: 'Details of all the users.',
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message ? error.message : 'Unexpected error occur.',
      success: false,
    });
  }
};

const getUserProfile = async (req, res) => {
  const { id } = req.query;
  try {
    const user = await User.findOne({
      where: {
        id: id,
      },
    });
    if (user === null) {
      return res.status(400).json({
        responseCode: 400,
        message: 'Selected user not found.',
        success: false,
      });
    }

    return res.status(200).json({
      responseCode: 200,
      data: user,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message ? error.message : 'Unexpected error occure.',
      success: false,
    });
  }
}

const deleteUser = async (req, res) => {
  const { body } = req;
  const { id } = body;
  console.log(id);

  try {
    await User.update(
      {
        is_deleted: true,
      },
      {
        where: {
          id: id,
        },
      }
    );
    return res.status(200).json({
      responseCode: 200,
      message: 'User deleted successfully',
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: error.message
        ? error.message
        : 'We are fetching some problem, try again after some time.',
      success: false,
    });
  }
};


/* ---------- Get All Comments Detail --------- */
const getComments = async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 10;
  const page = req.query.page ? parseInt(req.query.page) : 1;
  const skip = (page - 1) * limit;
  let searchValue = req.query.search ? req.query.search : null;
  let searchByStatus = req.query.searchByStatus
    ? req.query.searchByStatus
    : null;
  try {
    const queryParams = req.query;
    // page number is required
    if (!queryParams.page || parseInt(queryParams.page) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: 'Page not provided or incorrect',
        success: false,
      });
    }

    // limit is required
    if (!queryParams.limit || parseInt(queryParams.limit) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: 'Limit not provided or incorrect',
        success: false,
      });
    }

    const Op = Sequelize.Op;
    let condition = {};
    let innerCondition = {};
    if (searchValue) {
      condition = {
        [Op.or]: [
          {
            comment: {
              [Op.like]: '%' + searchValue.trim() + '%',
            },
          },
          {
            user_Name: {
              [Op.like]: '%' + searchValue.trim() + '%',
            },
          },

          Sequelize.where(
            Sequelize.col('Project.name'),
            { [Op.like]: '%' + searchValue.trim() + '%' } || ''
          ),
        ],
      };
    }
    if (searchByStatus != null) {
      condition.status = searchByStatus;
    }

    if (searchValue) {
      innerCondition = {
        [Op.or]: [
          {
            name: {
              [Op.like]: '%' + searchValue.trim() + '%',
            },
          },
        ],
      };
    }

    const result = await Comment.findAll({
      where: [{ ...condition }],
      include: [
        {
          model: Project,
          attributes: ['name'],
        },
      ],
      order: [['createdAt', 'DESC']],
      offset: skip,
      limit: limit,
    });

    const totalCount = await Comment.count({
      where: [{ ...condition }],
      include: [
        {
          model: Project,
          attributes: ['name'],
        },
      ],
    });

    if (result == null) {
      return res.status(400).json({
        responseCode: 400,
        message: 'No user found.',
        success: false,
      });
    }
    let pages = Math.ceil(totalCount / limit);
    return res.status(200).json({
      responseCode: 200,
      data: result,
      offset: skip,
      totalPages: pages,
      totalCount: totalCount,
      message: 'Details of all the users.',
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message ? error.message : 'Unexpected error occur.',
      success: false,
    });
  }
};

const changeSelectedCommentStatus = async (req, res) => {
  const { body } = req;
  const { id, status } = body;
  try {
    const comment = await Comment.findOne({
      where: {
        id: id,
      },
    });
    if (comment === null) {
      return res.status(400).json({
        responseCode: 400,
        message: 'Selected comment not found.',
        success: false,
      });
    }

    const updateComment = await Comment.update(
      {
        status: status,
      },
      {
        where: {
          id: id,
        },
      }
    );

    let messages =
      status == 1
        ? `Comment Active Successfully`
        : `Comment Deactive Successfully`;
    return res.status(200).json({
      responseCode: 200,
      data: updateComment,
      message: messages,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message ? error.message : 'Unexpected error occure.',
      success: false,
    });
  }
};

const changeSelectedUserStatus = async (req, res) => {
  const { body } = req;
  const { id, isActive } = body;
  try {
    const user = await User.findOne({
      where: {
        id: id,
      },
    });
    if (user === null) {
      return res.status(400).json({
        responseCode: 400,
        message: 'Selected user not found.',
        success: false,
      });
    }

    const updateUser = await User.update(
      {
        isActive: isActive,
      },
      {
        where: {
          id: id,
        },
      }
    );

    let messages =
      isActive == 1 ? `User Active Successfully` : `User Deactive Successfully`;
    return res.status(200).json({
      responseCode: 200,
      data: updateUser,
      message: messages,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message ? error.message : 'Unexpected error occure.',
      success: false,
    });
  }
};

const validate = async (req, res) => {
  try {
    const result = await Admin.findOne({
      where: { id: req.currentUser.id },
    });
    if (result == null) {
      throw {
        code: 401,
        message: 'Please login to continue',
        success: false,
      };
    }
    const result_data = {
      email: result.email,
      id: result.id,
    };
    return res.status(200).json({
      responseCode: 200,
      data: result_data,
      message: 'Admin validate succesfully.',
    });
  } catch (error) {
    const code = error.code ? error.code : 500;
    res.status(code).json({
      code: code,
      message: error.message ? error.message : 'Unexpected error occure.',
      success: false,
    });
  }
};

const getDashboard = async (req, res) => {
  try {
    const Op = Sequelize.Op;
    const totalUser = await User.count({
      where: {
        anonymousUser: 0,
        is_deleted: {
          [Op.ne]: true,
        },
      },
    });

    const totalProject = await Project.count({
      where: {
        is_deleted: {
          [Op.ne]: true,
        },
      },
    });
    const TotalInactiveUser = await User.count({
      where: {
        isActive: 0,
        anonymousUser: 0,
        is_deleted: {
          [Op.ne]: true,
        },
      },
    });
    const TotalActiveUser = await User.count({
      where: {
        isActive: 1,
        anonymousUser: 0,
        is_deleted: {
          [Op.ne]: true,
        },
      },
    });

    const [totalEarning] = await sequelize.query(
      "SELECT SUM(website_amount) AS total_tip, SUM(amount - website_amount) * 0.05 AS total_fee FROM Finances WHERE payment_status='Completed' ");

    const [todayEarning] = await sequelize.query(
      "SELECT SUM(website_amount) AS total_tip, SUM(amount - website_amount) * 0.05 AS total_fee FROM Finances WHERE payment_status='Completed' AND DATE_FORMAT(createdAt, '%Y-%m-%d') = DATE_FORMAT(NOW(), '%Y-%m-%d') ");

    const [weekEarning] = await sequelize.query(
      "SELECT SUM(website_amount) AS total_tip, SUM(amount-website_amount)*0.05 as total_fee FROM Finances WHERE payment_status='Completed' AND YEARWEEK(createdAt) = YEARWEEK(NOW())");

    const [monthEarning] = await sequelize.query(
      "SELECT SUM(website_amount) AS total_tip, SUM(amount-website_amount)*0.05 as total_fee FROM Finances WHERE payment_status='Completed' AND DATE_FORMAT(createdAt, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')");

    const [yearEarning] = await sequelize.query(
      "SELECT SUM(website_amount) AS total_tip, SUM(amount-website_amount)*0.05 as total_fee FROM Finances WHERE payment_status='Completed' AND YEAR(createdAt) = YEAR(NOW())");

    const [avgTip] = await sequelize.query(
      "SELECT AVG(website_amount) AS value FROM Finances WHERE payment_status='Completed'");

    const [avgOneTimePayment] = await sequelize.query(
      "SELECT AVG(amount) AS value FROM Finances WHERE payment_status='Completed'");

    const [avgRecurring] = await sequelize.query(
      "SELECT AVG(amount) AS value FROM Finances WHERE is_recurring=1 AND payment_status='Completed'");

    const [nextRecurringPayment] = await sequelize.query(
      "SELECT AVG(amount) AS value FROM Finances WHERE is_recurring=1 AND payment_status='Completed' AND DATE_FORMAT('createdAt', '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')");

    const totalRaised0 = await Finance.sum('amount', {
      where: {
        payment_status: 'Completed',
      }
    });

    const totalRaised1 = await RecurringDonars.sum('amount', {
    });

    const totalRaised = totalRaised0 + totalRaised1;

    const TotalPersonalProject = await Project.count({
      where: {
        is_deleted: {
          [Op.ne]: true,
        },
        [Op.or]: [{ category: 'personal' }, { category: 'Personal' }],
      },
    });
    const TotalBusinessProject = await Project.count({
      where: {
        is_deleted: {
          [Op.ne]: true,
        },
        [Op.or]: [{ category: 'business' }, { category: 'Business' }],
      },
    });
    const TotalCommunityProject = await Project.count({
      where: {
        is_deleted: {
          [Op.ne]: true,
        },
        [Op.or]: [{ category: 'community' }, { category: 'Community' }],
      },
    });


    return res.status(200).json({
      responseCode: 200,
      User: totalUser,
      Project: totalProject,
      InactiveUser: TotalInactiveUser,
      ActiveUser: TotalActiveUser,
      PersonalProject: TotalPersonalProject,
      CommunityProject: TotalCommunityProject,
      BusinessProject: TotalBusinessProject,
      TotalEarning: parseFloat(totalEarning[0].total_tip) + parseFloat(totalEarning[0].total_fee),
      todayEarning: parseFloat(todayEarning[0].total_tip) + parseFloat(todayEarning[0].total_fee),
      weekEarning: parseFloat(weekEarning[0].total_tip) + parseFloat(weekEarning[0].total_fee),
      monthEarning: parseFloat(monthEarning[0].total_tip) + parseFloat(monthEarning[0].total_fee),
      yearEarning: parseFloat(yearEarning[0].total_tip) + parseFloat(yearEarning[0].total_fee),
      avgTip: parseFloat(avgTip[0].value),
      avgOneTimePayment: parseFloat(avgOneTimePayment[0].value),
      avgRecurring: parseFloat(avgRecurring[0].value),
      nextRecurringPayment: parseFloat(nextRecurringPayment[0].value),
      totalRaised: totalRaised,
      message: 'Dashboard Data',
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message ? error.message : 'Unexpected error occur.',
      success: false,
    });
  }
};

const updatePassword = async (req, res) => {
  const { body } = req;
  const { id, oldPassword, password, confirmPassword } = body;
  try {
    const users = await Admin.findOne({
      where: { id: id },
    });

    // console.log("newPassword**************", password);

    const passwordMatch = await bcrypt.compareSync(oldPassword, users.password);
    // console.log("passwordMatch", passwordMatch);

    if (!passwordMatch) {
      throw {
        code: 400,
        message: 'Old Password did not match.',
        success: false,
      };
    }
    if (password != confirmPassword) {
      throw {
        code: 400,
        message: "Password and confirm password didn't match",
        success: false,
      };
    }
    var salt = bcrypt.genSaltSync(6);
    var hashedPassword = bcrypt.hashSync(password, salt);
    const result = await Admin.update(
      {
        password: hashedPassword,
      },
      {
        where: {
          id: id,
        },
      }
    );
    if (result == null) {
      return res.status(400).json({
        responseCode: 400,
        message: 'Admin not found.',
        success: false,
      });
    }
    return res.status(200).json({
      responseCode: 200,
      data: result,
      message: 'Password updated successfully.',
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message ? error.message : 'Unexpected error occur.',
      success: false,
    });
  }
};
const updateFeaturedProjects = async (req, res) => {
  const { body } = req;
  const { projectId, isFeatured } = body;
  console.log('inside update', req.body);
  try {
    const project = await Project.findOne({
      where: {
        id: projectId,
      },
    });
    console.log('project', project);
    if (project === null) {
      return res.status(400).json({
        responseCode: 400,
        message: 'Selected project not found.',
        success: false,
      });
    }
    // get count of featured projects
    const featuredProjectCount = await Project.count({
      where: { isFeatured: true },
    });
    if (featuredProjectCount > 14 && isFeatured === true) {
      return res.status(200).json({
        responseCode: 400,
        // data: updateProject,
        message: 'You can only mark 15 projects as featured.',
        success: false,
      });
    } else {
      const updateProject = await Project.update(
        {
          isFeatured: isFeatured,
        },
        {
          where: {
            id: projectId,
          },
        }
      );
      console.log('updateProject', updateProject);

      let messages =
        isFeatured == true
          ? `User Featured Successfully`
          : `User Unfeatured Successfully`;
      return res.status(200).json({
        responseCode: 200,
        data: updateProject,
        message: messages,
        success: true,
      });
    }
  } catch (error) {
    res.status(500).json({
      message: error.message ? error.message : 'Unexpected error occured.',
      success: false,
    });
  }
};

const updateFeaturedUser = async (req, res) => {
  const { body } = req;
  const { userId, isFeatured, is_featured_second } = body;

  const featuredField = typeof is_featured_second !== 'undefined' ? 'is_featured_second' : 'isFeatured';
  const featuredValue = typeof is_featured_second !== 'undefined' ? is_featured_second : isFeatured;
  try {
    const project = await User.findOne({
      where: {
        id: userId,
      },
    });

    if (project === null) {
      return res.status(400).json({
        responseCode: 400,
        message: 'Selected project not found.',
        success: false,
      });
    }
    // get count of featured users
    const featuredUserCount = await User.count({
      where: { [featuredField]: true },
    });

    if (featuredUserCount > 14 && featuredValue === true) {
      return res.status(200).json({
        responseCode: 400,
        message: 'You can only mark 15 profiles as featured.',
        success: false,
      });
    } else {
      const updateUserStatus = await User.update(
        {
          [featuredField]: featuredValue,
        },
        {
          where: {
            id: userId,
          },
        }
      );

      const message = featuredValue
        ? `User Featured Successfully`
        : `User Un-Featured Successfully`;

      return res.status(200).json({
        responseCode: 200,
        data: updateUserStatus,
        message: message,
        success: true,
      });
    }
  } catch (error) {
    res.status(500).json({
      message: error.message ? error.message : 'Unexpected error occured.',
      success: false,
    });
  }
};
//get user info api ends here
module.exports = {
  adminLogin,
  view,
  getProjects,
  deleteProject,
  changeProjectStatus,
  getUsers,
  getUserProfile,
  deleteUser,
  validate,
  changeSelectedUserStatus,
  getDashboard,
  updatePassword,
  getComments,
  changeSelectedCommentStatus,
  updateFeaturedProjects,
  updateFeaturedUser,
};
