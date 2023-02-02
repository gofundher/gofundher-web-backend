'use strict';

const { body } = require('express-validator/check');

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Invalid email')
    .trim(),
  body('password', 'Password must be at least 6 characters long.')
    .trim()
    .isLength({ min: 6 }),
  body('password', 'Password cannot be more than 18 characters long.')
    .trim()
    .isLength({ max: 18 }),
];

const signupValidation = [
  body('firstName')
    .not()
    .isEmpty()
    .withMessage('Please enter first name.')
    .trim()
    .isLength({ min: 3 })
    .withMessage('First name must be 3 characters long')
    .isLength({ max: 50 })
    .withMessage('First name cannot be more than 50 characters long'),
  body('lastName')
    .not()
    .isEmpty()
    .withMessage('Please enter last name.')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Last name must be 3 characters long')
    .isLength({ max: 50 })
    .withMessage('Last name cannot be more than 50 characters long'),
  body('email', 'Please enter email address')
    .trim()
    .isEmail()
    .withMessage('Email ID is not valid.'),
  body('password')
    .not()
    .isEmpty()
    .withMessage('Please enter password..')
    .trim()
    .isLength({ min: 6 })
    .withMessage('Password must be 6 characters long.'),
  body('password')
    .not()
    .isEmpty()
    .withMessage('Please enter password..')
    .trim()
    .isLength({ max: 18 })
    .withMessage('Password cannot be more than 18 characters long.'),
];

const socialValidation = [
  body('firstName')
    .not()
    .isEmpty()
    .withMessage('Please enter first name.')
    .trim()
    .isLength({ min: 3 })
    .withMessage('First name must be 3 characters long')
    .isLength({ max: 50 })
    .withMessage('First name cannot be more than 50 characters long'),
  body('lastName')
    .not()
    .isEmpty()
    .withMessage('Please enter last name.')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Last name must be 3 characters long')
    .isLength({ max: 50 })
    .withMessage('Last name cannot be more than 50 characters long'),
  body('email', 'Please enter email address')
    .trim()
    .isEmail()
    .withMessage('Email ID is not valid.'),
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .withMessage('Invalid email')
    .trim(),
];

const resetPasswordValidation = [
  body('newPassword', 'Password must be at least 6 characters long.')
    .trim()
    .isLength({ min: 6 }),
  body('newPassword', 'Password cannot be more than 18 characters long.')
    .trim()
    .isLength({ max: 18 }),
];

const paymentValidation = [
  body('cardNumber')
    .not()
    .isEmpty()
    .withMessage('Card Number is Required'),
  body('expMonth')
    .not()
    .isEmpty()
    .withMessage('Exp Month is Required'),
  body('expYear')
    .not()
    .isEmpty()
    .withMessage('Exp Year is Required'),
  body('cvc')
    .not()
    .isEmpty()
    .withMessage('cvc is Required'),
  body('amount')
    .not()
    .isEmpty()
    .withMessage('amount is Required'),
  // body('userId')
  // 	.not()
  // 	.isEmpty()
  // 	.withMessage('User Id is Required'),
  body('projectId')
    .not()
    .isEmpty()
    .withMessage('Project Id is Required'),
];

const changePasswordValidation = [
  body('oldPassword')
    .not()
    .isEmpty()
    .withMessage('Old Password is Required'),
  body('newPassword', 'Password must be at least 6 characters long.')
    .trim()
    .isLength({ min: 6 }),
  body('newPassword', 'Password cannot be more than 18 characters long.')
    .trim()
    .isLength({ max: 18 }),
];

module.exports = {
  loginValidation,
  signupValidation,
  socialValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  paymentValidation,
  changePasswordValidation,
};
