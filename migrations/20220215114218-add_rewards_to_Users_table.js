module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((t) => Promise.all([
    queryInterface.addColumn('Users', 'rewards', {
      type: Sequelize.TEXT,
      defaultValue: JSON.stringify([]),
    }, { transaction: t })
  ])),

  down: (queryInterface) => queryInterface.sequelize.transaction((t) => Promise.all([
    queryInterface.removeColumn('Users', 'rewards', { transaction: t }),
  ])),
};