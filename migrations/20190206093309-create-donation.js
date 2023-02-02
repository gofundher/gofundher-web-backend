/** @format */

'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Donations', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      is_info_sharable: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
      },
      account_id: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      routing_number: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      account_number: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      address: {
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
      postalCode: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      contactNumber: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      date_of_birth: {
        allowNull: true,
        type: Sequelize.DATEONLY,
      },
      ssn: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      identity_doc: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      error: {
        allowNull: true,
        type: Sequelize.TEXT,
      },
      paypal_email: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      paypal_mobile: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      paypal_photo_id: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      paypal_country: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      paypal_state: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      paypal_city: {
        allowNull: false,
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
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Donations');
  },
};
