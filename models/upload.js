'use strict';

module.exports = (sequelize, DataTypes) => {
	const Upload = sequelize.define(
		'Upload',
		{
			type: DataTypes.STRING,
			name: DataTypes.STRING,
			data: DataTypes.STRING,
			thumbnailImage: DataTypes.STRING,
		},
		{}
	);
	Upload.associate = function(models) {
		// associations can be defined here
	};
	return Upload;
};
