'use strict';
const mailChimpApiHelper = require('../helpers/mailChimpApiHelper');
const addMemberToList = require('../helpers/mailChimpApiHelper');

const addNewsLetter = async (req, res) => {
  try {
    const { body } = req;
    console.log(body, 'bodyyyyyyyyyy');
    const { email } = body;
    // const errors = await validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(422).json({
    //     responseCode: 422,
    //     message: "Validation error!",
    //     error: errors.array(),
    //     success: false
    //   });
    // }
    console.log(email, 'eamilllllllllll');
    const addMember = await addMemberToList(email, false, 'subscribed');
    if (addMember && addMember.isError) {
      return res.status(400).json({
        message: addMember.message,
        success: false,
      });
    } else {
      return res.status(200).json({
        message: addMember.message,
        success: addMember.isError,
      });
    }
  } catch (error) {
    console.log(error, 'errror');
  }
};
module.exports = {
  addNewsLetter,
};
