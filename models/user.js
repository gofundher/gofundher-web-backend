/** @format */

'use strict';

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      first_name: DataTypes.STRING,
      last_name: DataTypes.STRING,
      email: {
        type: DataTypes.STRING,
        unique: true,
      },
      password: DataTypes.STRING,
      isActive: DataTypes.BOOLEAN,
      street: DataTypes.STRING,
      city: DataTypes.STRING,
      state: DataTypes.STRING,
      zip: DataTypes.STRING,
      phone: DataTypes.STRING,
      personal_website: DataTypes.STRING,
      facebook: DataTypes.STRING,
      twitter: DataTypes.STRING,
      instagram: DataTypes.STRING,
      linkedin: DataTypes.STRING,
      youtube: DataTypes.STRING,
      tiktok: DataTypes.STRING,
      youtube_video_link: DataTypes.STRING,
      whatsapp:DataTypes.STRING,
      twitch:DataTypes.STRING,
      bio: DataTypes.STRING,
      is_receive_news: DataTypes.BOOLEAN,
      avatar: DataTypes.STRING,
      is_social: DataTypes.BOOLEAN,
      is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: 0,
      },
      is_acc_updated: {
        type: DataTypes.BOOLEAN,
        defaultValue: 0,
      },
      is_paypal_connected: {
        type: DataTypes.BOOLEAN,
        defaultValue: 0,
      },
      forget_token: {
        type: DataTypes.STRING,
      },
      profileUrl: DataTypes.STRING,
      last_login: DataTypes.DATE,
      next_donation_date: DataTypes.DATE,
      is_recurring: DataTypes.BOOLEAN,
      customer_id: DataTypes.STRING,
      plan_id: DataTypes.STRING,
      anonymousUser: DataTypes.BOOLEAN,
      isFeatured: DataTypes.BOOLEAN,
      is_featured_second: DataTypes.BOOLEAN,
      show_in_profile_list: {
        type: DataTypes.BOOLEAN,
        defaultValue: 1,
      },
      is_newsletter_subscribed: DataTypes.BOOLEAN,
      is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: 0,
      },
      rewards: DataTypes.TEXT,
    },
    {},
  );
  User.associate = function(models) {
    // associations can be defined here
    User.hasMany(models.Project, { foreignKey: 'userId' });
    User.hasOne(models.Donation, { foreignKey: 'user_id' });
    User.hasMany(models.Finance, { foreignKey: 'profile_id' });
  };
  // User.hasMany
  return User;
};
