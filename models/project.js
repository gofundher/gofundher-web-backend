/** @format */

'use strict';

module.exports = (sequelize, DataTypes) => {
  const Project = sequelize.define(
    'Project',
    {
      name: DataTypes.STRING,
      description: DataTypes.TEXT,
      url: {
        type: DataTypes.STRING,
        unique: true,
      },
      punch_line: DataTypes.STRING,
      category: DataTypes.STRING,
      video: DataTypes.STRING,
      amount: DataTypes.FLOAT(10, 2),
      deadline: DataTypes.DATE,
      userId: DataTypes.INTEGER,
      location: DataTypes.STRING,
      status: DataTypes.ENUM('draft', 'live'),
      project_location: DataTypes.STRING,
      percentage: DataTypes.FLOAT(10, 2),
      total_contributors: DataTypes.BIGINT(11),
      total_pledged: DataTypes.FLOAT(10, 2),
      gallery: DataTypes.TEXT,
      featured_image: DataTypes.TEXT,
      thumbnail_image: DataTypes.TEXT,
      reward: DataTypes.TEXT,
      faq: DataTypes.TEXT,
      plan_id: DataTypes.STRING,
      isFeatured: DataTypes.BOOLEAN,
      is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: 0,
      },
    },
    {},
  );
  Project.associate = function(models) {
    // associations can be defined here
    Project.belongsTo(models.User, {
      foreignKey: 'userId',
      onDelete: 'CASCADE',
    });
    // Project.hasMany(models.User, {
    //   foreignKey: "userId",
    //   onDelete: "CASCADE"
    // });
  };
  return Project;
};
