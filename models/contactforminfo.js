"use strict";

module.exports = (sequelize, DataTypes) => {
  const ContactFormInfo = sequelize.define(
    "ContactFormInfo",
    {
      name: DataTypes.STRING,
      email: DataTypes.STRING,
      message: DataTypes.TEXT,
      user_id: DataTypes.STRING,
      status: DataTypes.ENUM('open', 'pending','completed'),

    },
    {}
  );
  ContactFormInfo.associate = function (models) {
    // associations can be defined here
    ContactFormInfo.belongsTo(models.User, {
      foreignKey: "user_id",
      onDelete: "CASCADE",
    });
  };
  return ContactFormInfo;
};