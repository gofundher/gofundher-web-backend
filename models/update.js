'use strict';
module.exports = (sequelize, DataTypes) => {
  const Update = sequelize.define(
    'Update',
    {
      youtube_link: DataTypes.TEXT,
      image: DataTypes.TEXT,
      content: DataTypes.TEXT,
      project_id: DataTypes.INTEGER,
      date: DataTypes.DATE,
    },
    {},
  );
  Update.associate = function(models) {
    // associations can be defined here
    Update.belongsTo(models.Project, {
      foreignKey: 'project_id',
      onDelete: 'CASCADE',
    });
  };
  return Update;
};
