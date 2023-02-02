/** @format */

'use strict';

const { User } = require('../models');
const { Project } = require('../models');
const { Finance } = require('../models');
const { stripe_private_key } = require('./../constants');
const stripe = require('stripe')(stripe_private_key);
stripe.setApiVersion('2020-08-27'); // SET API VERSION
const Sequelize = require('sequelize');
const addMemberToList = require('../helpers/mailChimpApiHelper');
const Op = Sequelize.Op;
const {FRONTEND_URL} = process.env;
// GET USER INFO TO SHOW ON PROFILE (GET)
const showUserData = async (req, res) => {
  try {
    const currentUser = req.currentUser;
    const userId = currentUser.id;

    if (!userId) {
      return res.status(401).json({
        responseCode: 401,
        message: 'Bad request for user data!',
        error: error,
        success: false,
      });
    }

    const userRec = await User.findOne({
      where: { id: userId },
    });

    if (userRec) {
      return res.status(200).json({
        responseCode: 200,
        message: 'User fetched!',
        data: userRec,
        status: true,
      });
    }
  } catch (error) {
    return res.status(400).json({
      responseCode: 400,
      message: 'Error while fetching user info!',
      error: error,
      success: false,
    });
  }
};
// GET USER INFO TO SHOW ON PROFILE (GET)

// UPDATE USER PROFILE Rewards

const updateRewards = async (req, res) => {
  try {
    const currentUser = req.currentUser;
    const userId = currentUser.id;
    const { rewards } = req.body;
    await User.update(
      {
        rewards: JSON.stringify(rewards),
      },
      {
        where: { id: userId },
      },
    );
    return res.status(200).json({
      responseCode: 200,
      message: 'Rewards updated successfully!',
      success: true,
    });
  } catch (error) {
    return res.status(400).json({
      responseCode: 400,
      message: 'Error while updating rewards!',
      error: error,
      success: false,
    });
  }
};


// UPDATE USER PROFILE DATA
const updateProfile = async (req, res) => {
  try {
    const { body, currentUser } = req;
    const data = body;
    const userId = currentUser.id;
    const profileUrl = data.profileUrl;

    if (!data.userId) {
      return res.status(404).json({
        responseCode: 404,
        message: 'User id not provided',
        success: false,
      });
    }

    if (!data.firstName) {
      return res.status(404).json({
        responseCode: 404,
        message: 'First name not provided',
        success: false,
      });
    }

    if (!data.lastName) {
      return res.status(404).json({
        responseCode: 404,
        message: 'Last name not provided',
        success: false,
      });
    }

    const userRec = await User.findOne({
      where: {
        profileUrl: profileUrl,
        id: { [Op.ne]: userId },
      },
    });

    const userData = await User.findOne({
      where: { id: userId },
    });

    let email = data.email ? data.email.toLowerCase() : '';
    if (
      userData &&
      userData.dataValues &&
      userData.dataValues.is_newsletter_subscribed !==
        data.is_newsletter_subscribed
    ) {
      try {
        let status;
        if (data.is_newsletter_subscribed) {
          status = 'subscribed';
        } else {
          status = 'unsubscribed';
        }
        const addMember = await addMemberToList(
          email,
          true,
          status,
          data.userId,
        );
        if (addMember && addMember.isError) {
          return res.status(400).json({
            message: addMember.message,
            success: false,
          });
        }
      } catch (error) {
        console.log(error, 'error');
        return res.status(500).json({
          message: 'Unexpected error occurred',
          success: false,
        });
      }
    }
    const projectRec = await Project.findOne({
      where: {
        url: profileUrl,
      },
    });
    if (userRec || projectRec) {
      return res.status(400).json({
        message: 'This user profile url already exist ',
        profileUrlExist: true,
        success: false,
      });
    }
    await User.update(
      {
        first_name: data.firstName ? data.firstName : '',
        last_name: data.lastName ? data.lastName : '',
        street: data.street ? data.street : '',
        city: data.city ? data.city : '',
        state: data.state ? data.state : '',
        zip: data.zip ? data.zip : '',
        phone: data.phone ? data.phone : '',
        personal_website: data.personalWebsite ? data.personalWebsite : '',
        facebook: data.facebook ? data.facebook : '',
        twitter: data.twitter ? data.twitter : '',
        instagram: data.instagram ? data.instagram : '',
        linkedin: data.linkedin ? data.linkedin : '',
        youtube: data.youtube ? data.youtube : '',
        tiktok: data.tiktok ? data.tiktok : '',
        youtube_video_link: data.youtube_video_link
          ? data.youtube_video_link
          : '',
        whatsapp: data.whatsapp ? data.whatsapp : '',
        twitch: data.twitch ? data.twitch : '',
        bio: data.bio,
        is_receive_news: data.is_receive_news ? data.is_receive_news : 0,
        profileUrl: data.profileUrl,
        show_in_profile_list: data.show_in_profile_list,
        is_newsletter_subscribed: data.is_newsletter_subscribed,
        avatar: data.avatar ? data.avatar : '',
      },
      { where: { id: data.userId } },
    )
      .then(profileRes => {
        return res.status(200).json({
          responseCode: 200,
          data: profileRes.dataValues,
          message: 'Profile updated successfully',
          success: true,
        });
      })
      .catch(err => {});
  } catch (error) {
    console.log(error, 'errrrrrrrrrrrr');
    return res.status(400).json({
      responseCode: 400,
      message: 'Error while saving user info!',
      error: error,
      success: false,
    });
  }
};
// UPDATE USER PROFILE DATA

/* show user profile  */

const showuserprofile = async (req, res) => {
  try {
    const profileUrl = req.query.profileUrl;
    const userData = await User.findOne({
      where: {
        profileUrl: profileUrl,
      },
    });
    if (!userData) {
      return res.status(400).json({
        message: 'User not found',
        isExist: false,
        success: false,
      });
    }
    const id = userData.id;
    let condition = { status: 'live' };
    const projectData = await Project.findAll({
      where: {
        ...condition,
        userId: id,
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['email', 'is_verified', 'is_acc_updated', 'profileUrl', 'id'],
        },
      ],
    });
    const backedProjects = await Finance.findAll({
      where: {
        user_id: id,
        payment_status: 'Completed',
      },
      include: [
        {
          model: Project,
          attributes: ['name'],
        },
      ],
    });
    if (!projectData) {
      return res.status(200).json({
        message: ' user data  found but no project found',
        success: true,
        userData,
      });
    } else {
      return res.status(200).json({
        message: 'user and project both found',
        success: true,
        userData,
        projectData,
        backedProjects,
      });
    }
  } catch (err) {
    return res.status(400).json({
      message: 'Error while fetching the user info',
      success: false,
      error: err,
    });
  }
};

// SHOW PROFILES WITH PAGINATION (GET)
const getProfiles = async (req, res) => {
  try {
    const queryParams = req.query;
    const { name } = queryParams;
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

    const limit = parseInt(queryParams.limit); // data limit
    const page = parseInt(queryParams.page); // page number
    const offset = limit * (page - 1); // skip value
    let condition = {
      anonymousUser: 0,
      show_in_profile_list: 1,
      [Op.and]: [
        {
          avatar: {
            [Op.ne]: null,
          },
        },{
          avatar: {
            [Op.ne]: '',
          },
        },
      ],

      is_deleted: {
        [Op.ne]: true,
      },
      [Op.or]: [
        {
          is_acc_updated: 1,
          is_verified: 1,
        },
        {
          is_paypal_connected: 1,
        },
      ],
    };
    // // search by first name, last name
    if (name) {
      condition = {
        ...condition,
        [Op.or]: [
          Sequelize.where(
            Sequelize.fn(
              'concat',
              Sequelize.col('first_name'),
              ' ',
              Sequelize.col('last_name'),
            ),
            {
              [Op.like]: '%' + name.trim() + '%',
            },
          ),
        ],
      };
    }

    const userData = await User.findAndCountAll({
      where: [
        {
          ...condition,
        },
      ],
      limit: limit,
      offset: offset,
      order: [['createdAt', 'DESC']],
    });
    if (userData) {
      let pages = Math.ceil(parseInt(userData.count) / limit); // total number of pages for table
      return res.status(200).json({
        responseCode: 200,
        message: 'Profile fetched successfully!',
        data: userData,
        totalPages: pages,
        success: true,
      });
    } else {
      return res.status(400).json({
        responseCode: 400,
        message: 'Error while fetching profile data for table!',
        error: error,
        success: false,
      });
    }
  } catch (error) {
    return res.status(400).json({
      responseCode: 400,
      message: 'Error while fetching profiles!',
      error: error,
      success: false,
    });
  }
};


// Get user sponsor pages and profile page links
const getAllPagesLinks = async (req, res) => {
  const { currentUser: { id: loggedInUserId } } = req;
  // get current user profile page link
  const loggedInUser = await User.findOne({
    attributes: ['profileUrl'],
    where: {
      id: loggedInUserId,
    },
    raw: true
  });
  // get current user projects
  const userProjects = await Project.findAll({
    attributes: ['name', 'url', 'id'],
    where: {
      userId: loggedInUserId,
      is_deleted: 0,
    },
    raw: true
  });
  // map projects to urls list response format
  const projectsUrls = userProjects.map((project) => ({ id: project.id, title: project.name, url: project.url }));

  return res.json({
    responseCode: 200,
    success: true,
    message: 'All pages and links fetched successfully!',
    projects: projectsUrls,
    profile: { url: loggedInUser.profileUrl }
  });
}

// Post update profile link
const postUpdateProfileLinkUrl = async (req, res) => {
  try {
  const { currentUser: { id: loggedInUserId } } = req;
  const { profileUrl } = req.body;

  const isUrlUsedInAnotherProfile = await User.count({
    where: {
      profileUrl: profileUrl,
      id: { [Op.ne]: loggedInUserId },
    },
  });

  const isUrlUsedInAnotherProject = await Project.findOne({
    where: {
      url: profileUrl,
    },
  });

  // Check if url is used in another profile or project
  if(isUrlUsedInAnotherProject || isUrlUsedInAnotherProfile) {
    return res.status(400).json({
      message: 'This user profile url already exist ',
      profileUrlExist: true,
      success: false,
    });
  }

  
    const updatedUser = await User.update({
      profileUrl,
    }, {
      where: {
        id: loggedInUserId,
      },
      returning: true,
      raw: true
    });
    return res.json({
      responseCode: 200,
      message: 'Profile link updated successfully!',
      success: true,
      data: updatedUser,
    });

  } catch (error) {
    return res.status(400).json({
      responseCode: 400,
      message: 'Error while updating profile link!',
      success: false,
    });
  }
}

module.exports = {
  showUserData,
  updateProfile,
  showuserprofile,
  getProfiles,
  // Updates done Mouhsine bakhich
  getAllPagesLinks,
  postUpdateProfileLinkUrl,
  updateRewards
};
