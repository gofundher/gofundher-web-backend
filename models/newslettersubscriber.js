'use strict';
module.exports = (sequelize, DataTypes) => {
  const NewsletterSubscriber = sequelize.define(
    'NewsletterSubscriber',
    {
      memeber_id: DataTypes.STRING,
      email: DataTypes.STRING,
      user_id: DataTypes.STRING,
      status: DataTypes.BOOLEAN,
    },
    {},
  );
  NewsletterSubscriber.associate = function(models) {
    // associations can be defined here
  };
  return NewsletterSubscriber;
};
