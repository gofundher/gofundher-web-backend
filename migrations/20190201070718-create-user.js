/** @format */

'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      first_name: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      last_name: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      email: {
        allowNull: false,
        type: Sequelize.STRING,
        unique: true,
      },
      password: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      street: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      city: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      state: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      zip: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      phone: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      personal_website: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      facebook: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      twitter: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      instagram: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      youtube: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      linkedin: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      tiktok: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      youtube_video_link: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      whatsapp:{
        allowNull: true,
        type: Sequelize.STRING,
      },
      twitch:{
        allowNull: true,
        type: Sequelize.STRING
      },
      bio: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      is_receive_news: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
      },
      avatar: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      is_social: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
      },
      is_verified: {
        type: Sequelize.BOOLEAN,
      },
      is_acc_updated: {
        type: Sequelize.BOOLEAN,
      },
      is_paypal_connected: {
        type: Sequelize.BOOLEAN,
      },
      forget_token: {
        allowNull: true,
        type: Sequelize.STRING,
      },
      profileUrl: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      last_login: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      is_recurring: {
        type: Sequelize.BOOLEAN,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
      },
      anonymousUser: {
        type: Sequelize.BOOLEAN,
      },
      customer_id: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      plan_id: {
        allowNull: true,
        type: Sequelize.STRING,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      isFeatured: {
        type: Sequelize.BOOLEAN,
      },
      show_in_profile_list: {
        type: Sequelize.BOOLEAN,
      },
      is_newsletter_subscribed: {
        type: Sequelize.BOOLEAN,
      },
      is_deleted: {
        type: Sequelize.BOOLEAN,
      },
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Users');
  },
};
