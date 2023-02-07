/** @format */

'use strict';

module.exports = (sequelize, DataTypes) => {
  const Finance = sequelize.define(
    'Finance',
    {
      user_id: DataTypes.INTEGER,
      full_name: DataTypes.STRING,
      email: DataTypes.STRING,
      phone: DataTypes.STRING,
      is_info_sharable: DataTypes.BOOLEAN,
      checkout_id: DataTypes.STRING,
      is_recurring: DataTypes.BOOLEAN,
      next_donation_date: DataTypes.DATE,
      website_amount: DataTypes.DECIMAL(10, 2),
      tip_percentage: DataTypes.INTEGER,
      donation_id: DataTypes.STRING,
      project_id: DataTypes.INTEGER,
      amount: DataTypes.DECIMAL(10, 2),
      payout_amount: DataTypes.DECIMAL(10, 2),
      transferred_amount: DataTypes.DECIMAL(10, 2),
      transferred_via: DataTypes.ENUM('stripe', 'paypal', 'mobileNumber'),
      transfer_id: DataTypes.STRING,
      reward_id: DataTypes.INTEGER,
      status: DataTypes.BOOLEAN,
      profile_id: DataTypes.INTEGER,
      direct_donation: DataTypes.BOOLEAN,
      payment_by: DataTypes.ENUM('stripe', 'paypal'),
      payment_status: DataTypes.ENUM('Pending', 'Completed'),
      // payout_initiated: DataTypes.BOOLEAN,
      // payout_batch_id: DataTypes.STRING,
      payout_succeed: DataTypes.BOOLEAN,
      note: DataTypes.TEXT,
      webhook_event_id: DataTypes.STRING,
      comment: DataTypes.TEXT,
    },
    {},
  );
  Finance.associate = function(models) {
    Finance.belongsTo(models.Project, {
      foreignKey: 'project_id',
      onDelete: 'CASCADE',
    });
    Finance.belongsTo(models.User, {
      foreignKey: 'user_id',
      onDelete: 'CASCADE',
    });

    // associations can be defined here
  };

  return Finance;
};
