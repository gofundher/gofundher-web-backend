/** @format */

const unirest = require('unirest');
const md5 = require('md5');
const {
  mailchimpInstance,
  listUniqueId,
  mailchimpApiKey,
} = require('../config/mailchimpConfig');
const { NewsletterSubscriber } = require('../models');

const addMemberToList = async (
  email,
  isUpdate,
  status,
  id,
  firstName = '',
  lastName = '',
) => {
  const response = await checkMemberToList(email);
  console.log(response.status, 'response');
  if (response.status === 404) {
    const addResponse = await unirest(
      'POST',
      `https://${mailchimpInstance}.api.mailchimp.com/3.0/lists/${listUniqueId}/members`,
    )
      .headers({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization:
          'Basic ' + new Buffer('any:' + mailchimpApiKey).toString('base64'),
      })
      .send({
        email_address: email,
        merge_fields: {
          FNAME: firstName,
          LNAME: lastName,
        },
        status: 'subscribed',
      });
    if (addResponse && addResponse.body.status === 400) {
      return {
        isError: true,
        message: addResponse.body.detail,
      };
    } else {
      console.log(addResponse, 'addResponseaddResponse');
      let resp = await NewsletterSubscriber.build({
        memeber_id: addResponse.body.id,
        email: addResponse.body.email_address,
        user_id: id || null,
        status: 1,
      }).save();
      return {
        isError: false,
        message: 'You have subscribed to our newletter successfully',
      };
    }
  }
  //update the status of menber
  else {
    // if (isUpdate) {
    let memberStatus = isUpdate ? (status === 'subscribed' ? 1 : 0) : 1;

    const subscriberHash = md5(email);
    const resp = await unirest(
      'PATCH',
      `https://${mailchimpInstance}.api.mailchimp.com/3.0/lists/${listUniqueId}/members/${subscriberHash}`,
    )
      .headers({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization:
          'Basic ' +
          new Buffer('any:' + 'baad963cd5e18ec10dd45782512cfc34-us19').toString(
            'base64',
          ),
      })
      .send({
        email_address: email,
        status: status,
      });
    if (resp && resp.body && resp.body.status === 400) {
      return {
        isError: true,
        message: resp.body.detail,
      };
    } else {
      console.log(resp, 'resppppppppppp');
      const res = await NewsletterSubscriber.update(
        {
          memeber_id: resp.body.id,
          email: resp.body.email_address,
          user_id: id,
          status: memberStatus,
        },
        { where: isUpdate ? { user_id: id } : { memeber_id: resp.body.id } },
      );

      return {
        isError: false,
        message: isUpdate
          ? 'Status updated successfully'
          : 'You have subscribed to our newletter successfully',
      };
    }
    // } else {
    //   return {
    //     isError: false,
    //     message: 'You have subscribed to our newletter successfully',
    //   };
    // }
  }
};
//check member is exist or not in list
const checkMemberToList = async email => {
  console.log(email, 'checkMemberToList');

  const subscriberHash = md5(email ? email.toLowerCase() : '');
  const res = await unirest
    .get(
      `https://us19.api.mailchimp.com/3.0/lists/${listUniqueId}/members/${subscriberHash}`,
    )
    .headers({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization:
        'Basic ' +
        new Buffer('any:' + 'baad963cd5e18ec10dd45782512cfc34-us19').toString(
          'base64',
        ),
    });
  return res;
};

module.exports = addMemberToList;
