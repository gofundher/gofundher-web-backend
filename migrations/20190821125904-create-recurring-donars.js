"use strict";
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('RecurringDonars', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'User',
          key: 'id',
        },
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
      project_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Project',
          key: 'id',
        },
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
      },
      tip_amount: {
        type: Sequelize.DECIMAL(10, 2),
      },
      tip_precentage: {
        type: Sequelize.INTEGER,
      },
      subscribed_by: {
        type: Sequelize.ENUM('stripe', 'paypal'),
      },
      subscription_id: {
        allowNull: true,
        type: Sequelize.STRING,
      },
      next_donation_date: {
        type: Sequelize.DATE,
      },
      is_recurring: {
        type: Sequelize.BOOLEAN,
      },
      profile_id: {
        type: Sequelize.INTEGER,
      },
      direct_donation: {
        type: Sequelize.BOOLEAN,
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
    return queryInterface.dropTable("RecurringDonars");
  }
};
