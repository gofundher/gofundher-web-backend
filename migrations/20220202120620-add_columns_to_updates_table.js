module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((t) => Promise.all([
    queryInterface.addColumn('Updates', 'youtube_link', {
      type: Sequelize.STRING,
    }, { transaction: t }),
    queryInterface.addColumn('Updates', 'image', {
      type: Sequelize.STRING,
    }, { transaction: t })
  ])),

  down: (queryInterface) => queryInterface.sequelize.transaction((t) => Promise.all([
    queryInterface.removeColumn('Updates', 'youtube_link', { transaction: t }),
    queryInterface.removeColumn('Updates', 'image', { transaction: t }),
  ])),
};