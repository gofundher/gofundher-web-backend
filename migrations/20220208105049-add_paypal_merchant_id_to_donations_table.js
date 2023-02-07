module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((t) => Promise.all([
    queryInterface.addColumn('Donations', 'paypal_merchant_id', {
      type: Sequelize.STRING,
    }, { transaction: t })
  ])),

  down: (queryInterface) => queryInterface.sequelize.transaction((t) => Promise.all([
    queryInterface.removeColumn('Donations', 'paypal_merchant_id', { transaction: t }),
  ])),
};