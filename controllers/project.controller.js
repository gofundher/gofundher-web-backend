/** @format */

'use strict';

const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const emailSender = require('../helpers/mailSender');
const moment = require('moment');
const { createPlan } = require('../helpers/paypalApiHelper');
const {
  Project,
  Finance,
  User,
  Donation,
  Comment,
  Update,
} = require('../models');
const { sendNewUpdatesNotificationToSponsors } = require('../helpers/emails');

// SAVE PROJECT DETAILS API
const saveProjectDetails = async (req, res) => {
  try {
    const data = req.body;
    const projSubData = data.basicInfo;

    const gallery = data.gallery;

    if (!data.userId) {
      return res.status(404).json({
        responseCode: 404,
        message: 'User id not provided',
        success: false,
      });
    }

    if (!data.basicInfo) {
      return res.status(404).json({
        responseCode: 404,
        message: 'Sponsor Page data not provided',
        success: false,
      });
    }

    if (!data.gallery) {
      return res.status(404).json({
        responseCode: 404,
        message: 'Sponsor Page gallery data not provided',
        success: false,
      });
    }

    const projRec = await Project.findOne({
      where: {
        url: projSubData.url,
      },
    });

    const profileRec = await User.findOne({
      where: {
        profileUrl: projSubData.url,
      },
    });

    if (projRec || profileRec) {
      return res.status(401).json({
        responseCode: 401,
        message: 'This URL is used by your Profile page or by another user.',
        success: false,
      });
    }
    // To create billing plan in plan with basic price of $1

    const planId = await createPlan(projSubData.name, projSubData.caption);

    await Project.build({
      name: projSubData.name ? projSubData.name : '',
      description: projSubData.content ? projSubData.content : '',
      url: projSubData.url ? projSubData.url.toLowerCase() : '',
      punch_line: projSubData.caption ? projSubData.caption : '',
      category: projSubData.category ? projSubData.category : '',
      video: gallery.video ? gallery.video : '',
      amount: projSubData.amount ? projSubData.amount : 0.0,
      deadline: projSubData.deadline ? projSubData.deadline : null,
      userId: data.userId,
      location: projSubData.location ? projSubData.location : '',
      status: projSubData.status ? projSubData.status : 'draft',
      project_location: projSubData.project_location
        ? projSubData.project_location
        : '',
      percentage: projSubData.percentage ? projSubData.percentage : 0.0,
      total_contributors: projSubData.total_contributors
        ? projSubData.total_contributors
        : 0,
      total_pledged: projSubData.total_pledged
        ? projSubData.total_pledged
        : 0.0,
      gallery: projSubData.gallery ? JSON.stringify(projSubData.gallery) : '',
      featured_image: gallery.featuredImg ? gallery.featuredImg : '',
      thumbnail_image: gallery.thumbImage ? gallery.thumbImage : '',
      reward: data.rewards ? JSON.stringify(data.rewards) : null,
      faq: data.faqs ? JSON.stringify(data.faqs) : null,
      plan_id: planId,
    }).save();

    return res.status(200).json({
      responseCode: 200,
      message: 'Sponsor Page created successfully!',
      success: true,
    });
  } catch (error) {
    console.log(error, 'projectDetailErrrrrrrrrrrrrrrrrrrrr');
    return res.status(400).json({
      responseCode: 400,
      message: 'Error while creating Sponsor Page!',
      error: error,
      success: false,
    });
  }
};
// SAVE PROJECT DETAILS API

// SHOW PROJECTS WITH PAGINATION (GET)
const showProjects = async (req, res) => {
  try {
    const queryParams = req.query;
    const { name, category, percentage } = queryParams;
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

    let limit = parseInt(queryParams.limit); // data limit
    let page = parseInt(queryParams.page); // page number
    let offset = limit * (page - 1); // skip value
    let range1, range2;

    let condition = {
      status: 'live',
      is_deleted: {
        [Op.ne]: true,
      },
    };

    if (percentage === 'new') {
      const aMonthFromNowDate = moment().subtract(1, 'month').format('YYYY-MM-DD');
      condition.createdAt = {
        [Op.gte]: aMonthFromNowDate,
      };
    } else if (percentage) {
      const Percentage = percentage.split('-');
      range1 = Percentage[0];
      range2 = Percentage[1];
    }

    if (name) {
      condition = {
        ...condition,
        [Op.or]: [
          {
            name: {
              [Op.like]: `%${name}%`,
            },
          },

          {
            project_location: {
              [Op.like]: `%${name}%`,
            },
          },
          /*Sequelize.where(
            Sequelize.fn(
              'concat',
              Sequelize.col('User.first_name'),
              ' ',
              Sequelize.col('User.last_name'),
            ),
            {
              [Op.like]: '%' + name.trim() + '%',
            },
          ),*/
        ],
      };
    }
    if (category) {
      condition.category = category;
    }
    if (range1 && range2) {
      condition.percentage = {
        [Op.between]: [range1, range2],
      };
    }

    if (range1 === '100%') {
      if (range2 === 'undefined' || range2 === undefined) {
        condition.percentage = {
          [Op.gt]: 100,
        };
      }
    }

    const projectData = await Project.findAndCountAll({
      // where: condition,
      where: [{ ...condition }],
      limit: limit,
      offset: offset,
      order: [['createdAt', 'DESC']],
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
      include: [
        {
          model: User,
          where: {
            [Op.or]: [
              {
                is_acc_updated: 1,
                is_verified: 1,
              },
              {
                is_paypal_connected: 1,
              },
            ],
          },
          attributes: [
            'first_name',
            'last_name',
            'email',
            'is_verified',
            'is_acc_updated',
            'profileUrl',
            'is_paypal_connected',
          ],
        },
      ],
    });
    if (projectData) {
      let pages = Math.ceil(parseInt(projectData.count) / limit); // total number of pages for table
      return res.status(200).json({
        responseCode: 200,
        message: 'Sponsor Page fetched successfully!',
        data: projectData,
        totalPages: pages,
        success: true,
      });
    } else {
      return res.status(400).json({
        responseCode: 400,
        message: 'Error while fetching Sponsor Page data for table!',
        error: error,
        success: false,
      });
    }
  } catch (error) {
    return res.status(400).json({
      responseCode: 400,
      message: 'Error while fetching Sponsor Page!',
      error: error,
      success: false,
    });
  }
};
// SHOW ALL FEATURED PROJECTS
const showFeaturedProjects = async (req, res) => {
  const queryParams = req.query;
  const { isFeatured } = queryParams;

  let condition = { status: 'live' };
  if (isFeatured) {
    condition = {
      ...condition,
      isFeatured: {
        [Op.eq]: true,
      },
      is_deleted: {
        [Op.ne]: true,
      },
    };
  }
  try {
    const featuredCount = await Project.count({ where: condition });
    let result = '';
    // if featured project is not more than 3
    if (featuredCount > 3) {
      result = await Project.findAll({
        where: condition,
        attributes: [
          // 'category',
          // 'createdAt',
          'featured_image',
          // 'id',
          // 'isFeatured',
          // 'status',
          // 'total_contributors',
          'userId',
          'url',
          'thumbnail_image',
          'total_pledged',
          'percentage',
          'amount',
          'name',
          'punch_line',
        ],
        include: [
          {
            model: User,
            attributes: [
              'first_name',
              'last_name',
              'email',
              'is_verified',
              'is_acc_updated',
              'profileUrl',
              'is_paypal_connected',
            ],
          },
        ],
      });
    } else {
      result = await Project.findAll({
        limit: 10,
        offset: 0,
        order: [['createdAt', 'DESC']],
        where: {
          status: 'live',
          is_deleted: {
            [Op.ne]: true,
          },
        },
        attributes: [
          // 'category',
          // 'createdAt',
          'featured_image',
          // 'id',
          // 'isFeatured',
          // 'status',
          // 'total_contributors',
          'userId',
          'url',
          'thumbnail_image',
          'total_pledged',
          'percentage',
          'amount',
          'name',
          'punch_line',
        ],
        include: [
          {
            model: User,
            attributes: [
              'first_name',
              'last_name',
              'email',
              'is_verified',
              'is_acc_updated',
              'profileUrl',
              'is_paypal_connected',
            ],
          },
        ],
      });
    }
    return res.status(200).json({
      responseCode: 200,
      message: 'Sponsor Page fetched successfully',
      data: result,
      success: true,
    });
  } catch (error) {

    return res.status(400).json({
      responseCode: 400,
      message: 'Error while fetching Sponsor Page!',
      error: error,
      success: false,
    });
  }
};

// SHOW PROJECTS FOR SINGLE USER (GET)
const showUserProjects = async (req, res) => {
  try {
    const queryParams = req.query;
    const currentUser = req.currentUser;

    if (!queryParams.id || parseInt(queryParams.id) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: 'UserId not provided or incorrect!',
        success: false,
      });
    }

    let page = queryParams.page;
    let limit = queryParams.limit;

    if (!page || parseInt(page) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: 'Page not provided or incorrect',
        success: false,
      });
    }

    // limit is required
    if (!limit || parseInt(limit) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: 'Limit not provided or incorrect',
        success: false,
      });
    }

    let pageLimit = parseInt(limit); // data limit
    let pageNumber = parseInt(page); // page number
    let offset = limit * (page - 1); // skip value

    if (parseInt(queryParams.id) !== currentUser.id) {
      return res.status(404).json({
        responseCode: 404,
        message: 'AuthId not match with provided UserId!',
        success: false,
      });
    }

    const userId = parseInt(queryParams.id);

    const projRec = await Project.findAndCountAll({
      where: { userId: userId },
      limit: pageLimit,
      offset: offset,
      order: [['createdAt', 'DESC']],
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

    let pages;
    pages = Math.ceil(parseInt(projRec.count) / limit);

    if (projRec) {
      return res.status(200).json({
        responseCode: 200,
        message: 'User Sponsor Page fetched!',
        data: projRec,
        totalPages: pages,
        status: true,
      });
    } else {
      return res.status(200).json({
        responseCode: 200,
        message: 'No Sponsor Page created by user!',
        data: [],
        status: true,
      });
    }
  } catch (error) {
    return res.status(400).json({
      responseCode: 400,
      message: 'Error while fetching Sponsor Page for user!',
      error: error,
      success: false,
    });
  }
};
// SHOW PROJECTS FOR SINGLE USER (GET)

// GET PROJECT INFO BY URL (POST)
const getProjectByURL = async (req, res) => {
  try {
    const data = req.body;
    if (!data.url) {
      return res.status(404).json({
        responseCode: 404,
        message: 'Sponsor Page URL not provided!',
        success: false,
      });
    }
    const pdata = await Project.findOne({
      where: { url: data.url },
      include: [
        {
          model: User,
          attributes: [
            'first_name',
            'last_name',
            'email',
            'is_verified',
            'is_acc_updated',
            'is_paypal_connected',
            'profileUrl',
          ],
        },
      ],
    });
    if (pdata.id) {
      const updates = await Update.findAll({
        where: {
          project_id: pdata.id,
        },
        order: [['date', 'Desc']],
      });
      return res.status(200).json({
        responseCode: 200,
        message: 'Sponsor Page info fetched successfully!',
        data: pdata,
        updates,
        // isVerified: doantionData.is_verified,
        success: true,
      });
    } else {
      return res.status(400).json({
        responseCode: 400,
        message: 'URl not exist',
        success: false,
      });
    }
  } catch (error) {
    return res.status(400).json({
      responseCode: 400,
      message: 'Error while fetching Sponsor Page for user by URL!',
      error: error,
      success: false,
    });
  }
};

// GET PROJECT INFO BY URL for payment page (POST)
const getProjectBasicDetail = async (req, res) => {
  try {
    const data = req.body;
    if (!data.url) {
      return res.status(404).json({
        responseCode: 404,
        message: 'Sponsor Page URL not provided!',
        success: false,
      });
    }
    try {
      const pdata = await Project.findOne({
        where: { url: data.url },
        attributes: [
          'id',
          'amount',
          'reward',
          'userId',
          'name',
          'url',
          'plan_id',
        ],
        include: [
          {
            model: User,
            attributes: [
              'id',
              'first_name',
              'last_name',
              'email',
              'is_verified',
              'is_acc_updated',
              'is_paypal_connected',
              'profileUrl',
              'plan_id',
            ],
          },
        ],
      })
      const donation = await Donation.findOne({
        where: {
          user_id: pdata.userId,
        }
      });
      if (pdata) {
        return res.status(200).json({
          responseCode: 200,
          message: 'Sponsor Page info fetched successfully!',
          data: pdata,
          isPaypalConnected: donation?.paypal_onboarding_status === 'ACTIVE',
          success: true,
        });
      } else {
        return res.status(400).json({
          responseCode: 400,
          message: 'URl not exist',
          success: false,
        });
      }

    } catch (e) {
      return res.status(400).json({
        responseCode: 400,
        message: 'URl not exist',
        success: false,
      });
    };


  } catch (error) {
    return res.status(400).json({
      responseCode: 400,
      message: 'Error while fetching Sponsor Page for user by URL!',
      error: error,
      success: false,
    });
  }
};
// GET PROJECT INFO BY URL (GET)

// GET SINGLE PROJECT INFO (GET)
const getProjectInfo = async (req, res) => {
  try {
    const queryParams = req.query;

    if (!queryParams.id || parseInt(queryParams.id) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: 'Sponsor Page id not provided or incorrect!',
        success: false,
      });
    }

    const projectId = parseInt(queryParams.id);

    await Project.findOne({
      where: { id: projectId },
    })
      .then(pdata => {
        if (pdata) {
          return res.status(200).json({
            responseCode: 200,
            message: 'Sponsor Page info fetched successfully!',
            data: pdata,
            totalPages: pages,
            success: true,
          });
        } else {
          return res.status(401).json({
            responseCode: 401,
            message: 'Sponsor Page donot belong to provided user token!',
            success: false,
          });
        }
      })
      .catch(e => console.log('Error in geting project info: ', e));
  } catch (error) {
    return res.status(400).json({
      responseCode: 400,
      message: 'Error while updating Sponsor Page info!',
      error: error,
      success: false,
    });
  }
};
// GET SINGLE PROJECT INFO (GET)

// UPDATE SINGLE PROJECT INFO
const updateProjectInfo = async (req, res) => {

  try {
    const data = req.body;
    const projSubData = data.basicInfo;
    const gallery = data.gallery;
    if (!data.url) {
      return res.status(404).json({
        responseCode: 404,
        message: 'Sponsor Page url not provided',
        success: false,
      });
    }

    if (!data.basicInfo) {
      return res.status(404).json({
        responseCode: 404,
        message: 'Sponsor Page update data not provided',
        success: false,
      });
    }

    if (!data.gallery) {
      return res.status(404).json({
        responseCode: 404,
        message: 'Sponsor Page gallery data not provided',
        success: false,
      });
    }
    const projRec = await Project.findOne({
      where: {
        url: projSubData.url,
        id: {
          [Op.ne]: data.id,
        },
      },
    });

    const projDetails = await Project.findOne({
      where: {
        id: data.id,
      },
    });

    const profileRec = await User.findOne({
      where: { profileUrl: projSubData.url },
    });

    if (projRec || profileRec) {
      return res.status(401).json({
        responseCode: 401,
        message: 'This URL is used by your Profile page or by another user.',
        success: false,
      });
    }

    var collectedPercentage =
      (projDetails.total_pledged * 100) / projSubData.amount;
    if (data.removedUpdates) {
      data.removedUpdates.forEach(async element => {
        await Update.destroy({
          where: { id: element },
        });
      });
    }
    if (data.updates?.length) {
      const updatesPromises = data.updates.map(async update => {
        if (update.id) {
          return Update.update(
            {
              youtube_link: update.youtube_link,
              image: update.image,
              content: update.content,
              date: update.date,
              project_id: data.id,
            },
            { where: { id: update.id } },
          );
        } else {
          return Update.create({
            content: update.content,
            youtube_link: update.youtube_link,
            image: update.image,
            date: update.date,
            project_id: data.id,
          });
        }
      });
      await Promise.all(updatesPromises);
      const newUpdatesCreated = data.updates.some(update => !update.id);
      if (newUpdatesCreated) {
        await sendNewUpdatesNotificationToSponsors(data.id);
      }
    }
    await Project.update(
      {
        percentage: collectedPercentage ? collectedPercentage : 0.0,
        name: projSubData.name ? projSubData.name : '',
        url: projSubData.url ? projSubData.url.toLowerCase() : '',
        description: projSubData.content ? projSubData.content : '',
        punch_line: projSubData.caption ? projSubData.caption : '',
        category: projSubData.category ? projSubData.category : '',
        video: gallery.video ? gallery.video : '',
        amount: projSubData.amount ? projSubData.amount : 0.0,
        deadline: projSubData.deadline ? projSubData.deadline : null,
        location: projSubData.location ? projSubData.location : '',
        status: data.status ? data.status : 'draft',
        project_location: projSubData.project_location
          ? projSubData.project_location
          : '',
        gallery: projSubData.gallery ? JSON.stringify(projSubData.gallery) : '',
        featured_image: gallery.featuredImg ? gallery.featuredImg : '',
        thumbnail_image: gallery.thumbImage ? gallery.thumbImage : '',
        reward: data.rewards ? JSON.stringify(data.rewards) : null,
        faq: data.faqs ? JSON.stringify(data.faqs) : null,
      },
      { where: { id: data.id } },
    )
      .then(() => {
        return res.status(200).json({
          responseCode: 200,
          message: 'Sponsor Page updated successfully!',
          success: true,
        });
      })
      .catch(err => {
        throw err;
      });
  } catch (error) {
    console.log(error, 'error');

    return res.status(400).json({
      responseCode: 400,
      message: 'Error while updating Sponsor Page info!',
      error: error,
      success: false,
    });
  }
};

// PROJECT SEARCH API WITH PAGINATION
const searchProjectDetails = async (req, res) => {
  const { query } = req;
  const { page, limit, name, category, percentage } = query;
  try {
    // page number is required
    if (!page || parseInt(page) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: 'Page not provided or incorrect',
        success: false,
      });
    }

    // limit is required
    if (!limit || parseInt(limit) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: 'Limit not provided or incorrect',
        success: false,
      });
    }

    let pageLimit = parseInt(limit); // data limit
    let offset = limit * (page - 1); // skip value

    let range1, range2;
    if (percentage) {
      const Percentage = percentage.split('-');
      range1 = Percentage[0];
      range2 = Percentage[1];
    }
    let condition = {};

    if (name) {
      condition.name = {
        [Op.like]: `%${name}%`,
      };
    }
    if (category) {
      condition.category = category;
    }
    if (range1 && range2) {
      condition.percentage = {
        [Op.between]: [range1, range2],
      };
    }

    const searchResult = await Project.findAndCountAll({
      where: condition,
      limit: pageLimit,
      offset: offset,
    });
    let pages;
    pages = Math.ceil(parseInt(searchResult.count) / limit);

    if (searchResult && pages !== 0) {
      return res.status(200).json({
        data: searchResult,
        message: 'Data found!',
        totalPages: pages,
      });
    }
    return res.status(200).json({
      data: [],
      message: 'Data Not Found',
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: 'We are fetching some problem, try again after some time.',
      success: false,
    });
  }
};
// PROJECT SEARCH API WITH PAGINATION

/* CREATED BY: RISHABH BULA,
  DATED: 07/02/2019
*/

// FUNCTION FOR GET DONATION DATA OF PERTICULAR PROJECT
const getDonationByUrl = async (req, res) => {
  const { query } = req;
  const { page, limit, projectUrl } = query;
  try {
    // page number is required
    if (!page || parseInt(page) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: 'Page not provided or incorrect',
        success: false,
      });
    }

    // limit is required
    if (!limit || parseInt(limit) <= 0) {
      return res.status(404).json({
        responseCode: 404,
        message: 'Limit not provided or incorrect',
        success: false,
      });
    }

    let pageLimit = parseInt(limit); // data limit
    let pageNumber = parseInt(page); // page number
    let offset = limit * (page - 1); // skip value

    const projectData = await Project.findOne({
      where: {
        url: projectUrl,
      },
    });
    if (!projectData) {
      return res.status(400).json({
        responseCode: 400,
        message: 'Project Not Found',
        success: false,
      });
    }
    const donationData = await Finance.findAndCountAll({
      where: {
        project_id: projectData.id,
        payment_status: 'Completed',
      },
      limit: pageLimit,
      offset: offset,
      order: [['createdAt', 'DESC']],
    });

    let pages;
    pages = Math.ceil(parseInt(donationData.count) / limit);
    if (!donationData) {
      return res.status(400).json({
        responseCode: 400,
        message: 'Donation Data Not Found',
        success: false,
      });
    }
    return res.status(200).json({
      responseCode: 200,
      doantionData: donationData,
      totalPages: pages,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: 'We are fetching some problem, try again after some time.',
      success: false,
    });
  }
};
/* CREATED BY: RISHABH BULA,
   DATED: 07/02/2019 */

// FUNCTION FOR GET DONATION DATA OF PERTICULAR PROJECT

// FUNCTION FOR CHECK DONATION ACOUNT VERIFICATION
/* CREATED BY: RISHABH BULA,
   DATED: 18/02/2019
   UPDATED BY: RISHABH BULA,
   DATED: 18/02/2019
*/
const checkAccountVerification = async (req, res) => {
  const { body } = req;
  const { userId } = body;
  try {
    if (!userId) {
      return res.status(400).json({
        responseCode: 400,
        message: 'User id not provided',
        success: false,
      });
    }
    const donationData = await Donation.findOne({
      where: {
        user_id: userId,
      },
    });
    if (!donationData) {
      return resizeTo.status(400).json({
        responseCode: 400,
        message: 'Donation account not found',
        success: false,
      });
    }
    if (!donationData.is_verified) {
      return res.status(200).json({
        responseCode: 200,
        message: 'User acount not verified',
        isVerified: false,
      });
    }
    return res.status(200).json({
      responseCode: 200,
      message: 'User acount verified',
      isVerified: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: 'We are fetching some problem, try again after some time.',
      success: false,
    });
  }
};
//FUNCTION TO DELETE PROJECT BY ID
const deleteProjectBYId = async (req, res) => {
  const { body } = req;
  const { projectId } = body;
  try {
    if (!projectId) {
      return res.status(400).json({
        responseCode: 400,
        message: 'Sponsor Page id not provided',
        success: false,
      });
    }
    const result = await Project.destroy({
      where: {
        id: projectId,
      },
    });
    if (!result) {
      return res.status(400).json({
        responseCode: 400,
        message: 'Sponsor Page not deleted',
        success: false,
      });
    }
    return res.status(200).json({
      responseCode: 200,
      message: 'Sponsor Page Deleted Successfully',
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: 'We are fetching some problem, try again after some time.',
      success: false,
    });
  }
};
//FUNCTION TO DELETE PROJECT BY ID

//FUNCTION TO DELETE MULTIPLE PROJECT BY ID
const deleteMultipleProjectBYId = async (req, res) => {
  const { body } = req;
  const { projectIds } = body;
  try {
    if (!projectIds) {
      return res.status(400).json({
        responseCode: 400,
        message: 'Project ids not provided',
        success: false,
      });
    }
    const deleteResult = await Project.destroy({
      where: {
        id: [projectIds],
      },
    });
    if (!deleteResult) {
      return res.status(400).json({
        responseCode: 400,
        message: 'Projects not deleted, please check provided project ids',
        success: false,
      });
    }
    return res.status(200).json({
      responseCode: 200,
      message: 'Projects deleted successfully',
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: 'We are fetching some problem, try again after some time.',
      success: false,
    });
  }
};

//FUNCTION TO UPDATE STATUS OF PROJECT BY ID
const updateProjectStatus = async (req, res) => {
  const { body } = req;
  const { projectId, status } = body;
  try {
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
      },
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

//Function to add comments
const addComment = async (req, res) => {
  try {
    const { id, email, text, name, projectId, commentId } = req.body;

    /* const userId = body.userId; */
    if (!text && !commentId) {
      return res.status(400).json({
        message: 'Comment Not provided',
        success: false,
      });
    } else if (!text && commentId) {
      return res.status(400).json({
        message: 'Reply Not provided',
        success: false,
      });
    }

    const project = await Project.findByPk(projectId, { attributes: ['name', 'userId'], raw: true });
    const projectOwner = await User.findByPk(project?.userId, { attributes: ['first_name', 'last_name'], raw: true });
    const userData = id
      ? await User.findOne({
        where: {
          id,
        },
      })
      : {};

    const response = await Comment.build({
      comment: text ?? null,
      user_id: id ?? null,
      email: email ?? null,
      user_Name: name ?? null,
      project_id: projectId ?? null,
      parent_id: commentId ?? null,
    }).save();

    response.vvfd = 'userData';

    if (response) {
      if (project && projectOwner) {
        new emailSender().sendMail(
          [userData.email],
          `You have a new comment on your sponsor page ${project.name}`,
          ' ',
          'GoFundHer',
          // project.User ? project.User.email : "",
          ' ',
          'projectNewComment', {
          fullName: `${projectOwner.first_name} ${projectOwner.last_name}`,
          projectName: project.name,
        },
          true,
        )
      }

      return res.status(200).json({
        message: `${commentId ? 'Reply' : 'Comment'} added successfully`,
        result: response,
        User: userData,
        success: true,
      });
    }
  } catch (error) {

    return res.status(500).json({
      message: 'Error occured while addind a comment ',
      error,
      success: false,
    });
  }
};

//Function to show comments
const showComments = async (req, res) => {
  try {
    const { projectId, offset, limit } = req.query;
    let offsetValue = parseInt(offset) || 0;
    let limitValue = parseInt(limit) || 0;
    const comments = await Comment.findAndCountAll({
      where: {
        project_id: projectId,
        parent_id: null,
        status: true || 1,
      },
      offset: offsetValue,
      limit: limitValue,
      order: [['createdAt', 'Desc']],
      include: [
        {
          model: User,
          attributes: ['first_name', 'last_name', 'avatar', 'profileUrl'],
        },
      ],
    });

    if (!comments) {
      return res.status(400).json({
        message: 'No comments founds',
        success: false,
      });
    }
    return res.status(200).json({
      message: ' Comments fetched successfully',
      data: comments,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error while fetching the comments ',
      error,
      success: false,
    });
  }
};

//Function to get updates
const getUpdates = async (req, res) => {
  try {
    const { projectId, offset, limit } = req.query;
    let offsetValue = parseInt(offset) || 0;
    let limitValue = parseInt(limit) || 0;
    const updates = await Update.findAndCountAll({
      where: {
        project_id: projectId,
      },
      offset: offsetValue,
      limit: limitValue,
      order: [['date', 'Desc']],
    });

    if (!updates) {
      return res.status(400).json({
        message: 'No updates founds',
        success: false,
      });
    }
    return res.status(200).json({
      message: 'Updates fetched successfully',
      data: updates,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error while fetching the updates',
      error,
      success: false,
    });
  }
};

const addReply = async (req, res) => {
  try {
    const { body } = req;
    const { projectId, reply } = body;
    if (!reply) {
      return res.status(400).json({
        message: 'Reply Not provided',
        success: false,
      });
    }
    return res.status(200).json({
      message: ' Reply added successfully',
      response: comments,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error while adding the reply ',
      error,
      success: false,
    });
  }
};
// Mouhsine bakhich
// 01/02/2022
// Post update profile link
const postUpdateProjectUrl = async (req, res) => {
  try {
    const { currentUser: { id: loggedInUserId } } = req;
    const { url, projectId } = req.body;

    // check if this project belongs to the current user 
    const projectExist = await Project.count({
      where: {
        id: projectId,
        userId: loggedInUserId,
      },
    });

    if (!projectExist) {
      return res.status(400).json({
        message: 'Project not found',
        success: false,
      });
    }

    const isUrlUsedInAnotherProfile = await User.count({
      where: {
        profileUrl: url,
        id: { [Op.ne]: loggedInUserId },
      },
    });

    const isUrlUsedInAnotherProject = await Project.findOne({
      where: {
        url,
      },
    });

    // Check if url is used in another profile or project
    if (isUrlUsedInAnotherProject || isUrlUsedInAnotherProfile) {
      return res.status(400).json({
        message: 'This link is already used, pick another one.',
        urlExist: true,
        success: false,
      });
    }

    const updatedProject = await Project.update({
      url,
    }, {
      where: {
        userId: loggedInUserId,
        id: projectId,
      },
      returning: true,
      raw: true
    });

    return res.json({
      responseCode: 200,
      message: 'Project link updated successfully!',
      success: true,
      data: updatedProject,
    });

  } catch (error) {
    return res.status(400).json({
      responseCode: 400,
      message: 'Error while updating project link!',
      success: false,
    });
  }
}

module.exports = {
  saveProjectDetails,
  showProjects,
  showUserProjects,
  getProjectByURL,
  getProjectInfo,
  updateProjectInfo,
  searchProjectDetails,
  getDonationByUrl,
  checkAccountVerification,
  deleteProjectBYId,
  deleteMultipleProjectBYId,
  updateProjectStatus,
  addComment,
  showComments,
  getUpdates,
  addReply,
  showFeaturedProjects,
  getProjectBasicDetail,
  postUpdateProjectUrl
};
