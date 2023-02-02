'use strict';

const express = require('express');
const router = express.Router();
const authentication = require('../helpers/tokenVerification');
const projectController = require('../controllers/project.controller');

// save project data
router.post(
  '/create_project',
  authentication.userAuthentication,
  projectController.saveProjectDetails,
);

// get all projects
router.get('/get_project', projectController.showProjects);
// get all projects by isFeatured filter
router.get('/get_all_project', projectController.showFeaturedProjects);
router.post(
  '/get_project_basic_detail',
  projectController.getProjectBasicDetail,
);

// get projects for one user
router.get(
  '/get_user_project',
  authentication.userAuthentication,
  projectController.showUserProjects,
);

// get projects by url
router.post('/get_project_by_url', projectController.getProjectByURL);

// get single project info
router.get('/get_project_info', projectController.getProjectInfo);

// update project status
router.put(
  '/update_project_status',
  authentication.userAuthentication,
  projectController.updateProjectStatus,
);

// update project info
router.post(
  '/update_project_info',
  authentication.userAuthentication,
  projectController.updateProjectInfo,
);

// search project
router.get('/project_search', projectController.searchProjectDetails);

//get donation data
router.get(
  '/donation_data',
  authentication.userAuthentication,
  projectController.getDonationByUrl,
);

// donation account verification
router.post(
  '/acount-verification',
  authentication.userAuthentication,
  projectController.checkAccountVerification,
);

// delete project by id
router.delete(
  '/delete-project',
  authentication.userAuthentication,
  projectController.deleteProjectBYId,
);

// delete multiple projects by id
router.delete(
  '/delete-multiprojects',
  authentication.userAuthentication,
  projectController.deleteMultipleProjectBYId,
);

//to add single comment
router.post(
  '/add-comment',
  /* authentication.userAuthentication,*/
  projectController.addComment,
);

// to show comments
router.get(
  '/showcomments',
  /* authentication.userAuthentication, */
  projectController.showComments,
);

// to show comments
router.get('/get-updates', projectController.getUpdates);

//to add reply
router.post(
  '/add-reply',
  /* authentication.userAuthentication,*/
  projectController.addReply,
);

router.post(
  '/get_Project_Basic_Detail',
  projectController.getProjectBasicDetail,
);

// update logged in user project url
router.put(
  '/update-project-url',
  authentication.userAuthentication,
  projectController.postUpdateProjectUrl,
);

module.exports = router;
