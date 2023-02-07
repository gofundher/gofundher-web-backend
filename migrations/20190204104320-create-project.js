/** @format */

'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Projects', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      description: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      url: {
        allowNull: false,
        type: Sequelize.STRING,
        unique: true,
      },
      punch_line: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      category: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      video: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      amount: {
        allowNull: false,
        type: Sequelize.FLOAT(10, 2),
      },
      deadline: {
        allowNull: true,
        type: Sequelize.DATE,
      },
      userId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      location: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      status: {
        allowNull: false,
        type: Sequelize.ENUM('draft', 'live'),
      },
      project_location: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      percentage: {
        allowNull: false,
        type: Sequelize.FLOAT(10, 2),
      },
      total_contributors: {
        allowNull: false,
        type: Sequelize.DataTypes.BIGINT(11),
      },
      total_pledged: {
        allowNull: false,
        type: Sequelize.Sequelize.FLOAT(10, 2),
      },
      gallery: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      featured_image: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      thumbnail_image: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      reward: {
        allowNull: true,
        type: Sequelize.TEXT,
      },
      faq: {
        allowNull: true,
        type: Sequelize.TEXT,
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
      is_deleted: {
        type: Sequelize.BOOLEAN,
      },
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Projects');
  },
};
