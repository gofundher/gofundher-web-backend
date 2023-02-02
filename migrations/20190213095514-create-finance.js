/** @format */

'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Finances', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        type: Sequelize.INTEGER,
      },
      full_name: {
        type: Sequelize.STRING,
      },
      email: {
        type: Sequelize.STRING,
      },
      phone: {
        type: Sequelize.STRING,
      },
      is_info_sharable: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
      },
      is_recurring: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
      },
      next_donation_date: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      website_amount: {
        type: Sequelize.DECIMAL(10, 2),
      },
      tip_percentage: {
        type: Sequelize.INTEGER,
      },
      donation_id: {
        type: Sequelize.STRING,
      },
      checkout_id: {
        type: Sequelize.STRING,
      },
      project_id: {
        type: Sequelize.INTEGER,
        onDelete: 'set null',
        onUpdate: 'no action',
        references: {
          model: 'Projects',
          key: 'id',
        },
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
      },
      payout_amount: {
        type: Sequelize.DECIMAL(10, 2),
      },
      transferred_amount: {
        type: Sequelize.DECIMAL(10, 2),
      },
      transferred_via: {
        type: Sequelize.ENUM('stripe', 'paypal'),
      },
      transfer_id: {
        type: Sequelize.STRING,
      },
      reward_id: {
        type: Sequelize.INTEGER,
      },
      status: {
        type: Sequelize.BOOLEAN,
      },
      profile_id: {
        type: Sequelize.INTEGER,
      },
      direct_donation: {
        type: Sequelize.BOOLEAN,
      },
      payment_by: {
        type: Sequelize.ENUM('stripe', 'paypal', 'mobileNumber'),
      },
      // payout_initiated: {
      //   type: Sequelize.BOOLEAN
      // },
      payout_succeed: {
        type: Sequelize.BOOLEAN,
      },
      note: {
        type: Sequelize.STRING,
      },
      comment: {
        type: Sequelize.STRING,
      },
      webhook_event_id: {
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
    return queryInterface.dropTable('Finances');
  },
};
