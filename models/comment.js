"use strict";
module.exports = (sequelize, DataTypes) => {
  const Comment = sequelize.define(
    "Comment",
    {
      comment: DataTypes.TEXT,
      user_id: DataTypes.INTEGER,
      email: DataTypes.STRING,
      user_Name: DataTypes.STRING,
      project_id: DataTypes.INTEGER,
      parent_id: DataTypes.INTEGER,
      status: {
        type: DataTypes.BOOLEAN,
        defaultValue: 1
      },
    },
    {}
  );
  Comment.associate = function(models) {
    // associations can be defined here
    Comment.belongsTo(models.User, {
      foreignKey: "user_id",
      onDelete: "CASCADE"
    });

    Comment.belongsTo(models.Project, {
      foreignKey: "project_id",
      onDelete: "CASCADE"
    });
  };
  return Comment;
};
