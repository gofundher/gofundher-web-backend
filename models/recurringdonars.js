/** @format */

'use strict';
module.exports = (sequelize, DataTypes) => {
  const RecurringDonars = sequelize.define(
    'RecurringDonars',
    {
      user_id: DataTypes.INTEGER,
      full_name: DataTypes.STRING,
      email: DataTypes.STRING,
      phone: DataTypes.STRING,
      is_info_sharable: DataTypes.BOOLEAN,
      project_id: DataTypes.INTEGER,
      amount: DataTypes.DECIMAL(10, 2),
      tip_amount: DataTypes.DECIMAL(10, 2),
      tip_percentage: DataTypes.INTEGER,
      subscribed_by: DataTypes.ENUM('stripe', 'paypal'),
      subscription_id: DataTypes.STRING,
      next_donation_date: DataTypes.DATE,
      is_recurring: DataTypes.BOOLEAN,
      profile_id: DataTypes.INTEGER,
      direct_donation: DataTypes.BOOLEAN,
    },
    {},
  );
  RecurringDonars.associate = function(models) {
    // associations can be defined here
    RecurringDonars.belongsTo(models.Project, {
      foreignKey: 'project_id',
      onDelete: 'CASCADE',
    });
    RecurringDonars.belongsTo(models.User, {
      foreignKey: 'user_id',
      onDelete: 'CASCADE',
    });
  };
  return RecurringDonars;
};
