/** @format */

'use strict';

module.exports = (sequelize, DataTypes) => {
  const Donation = sequelize.define(
    'Donation',
    {
      user_id: DataTypes.STRING,
      account_id: DataTypes.STRING,
      routing_number: DataTypes.STRING,
      account_number: DataTypes.STRING,
      date_of_birth: DataTypes.DATEONLY,
      ssn: DataTypes.STRING,
      address: DataTypes.STRING,
      city: DataTypes.STRING,
      phone: DataTypes.STRING,
      state: DataTypes.STRING,
      postal_code: DataTypes.STRING,
      identity_doc: DataTypes.STRING,
      error: DataTypes.TEXT,
      paypal_email: DataTypes.STRING,
      paypal_mobile: DataTypes.STRING,
      paypal_photo_id: DataTypes.STRING,
      paypal_country: DataTypes.STRING,
      paypal_state: DataTypes.STRING,
      paypal_city: DataTypes.STRING,
      paypal_merchant_id: DataTypes.STRING,
      paypal_onboarding_status: DataTypes.ENUM('WAITING', 'ACTIVE', 'DECLINED'),
    },
    {},
  );
  Donation.associate = function(models) {
    // associations can be defined here
  };
  return Donation;
};
