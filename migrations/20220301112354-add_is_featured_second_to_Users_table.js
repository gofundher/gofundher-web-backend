module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((t) => Promise.all([
    queryInterface.addColumn('Users', 'is_featured_second', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    }, { transaction: t })
  ])),

  down: (queryInterface) => queryInterface.sequelize.transaction((t) => Promise.all([
    queryInterface.removeColumn('Users', 'is_featured_second', { transaction: t }),
  ])),
};