module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((t) => Promise.all([
    queryInterface.addColumn('Donations', 'paypal_onboarding_status', {
      type: Sequelize.ENUM,
      defaultValue: 'WAITING',
      values: [
        'WAITING',
        'ACTIVE',
        'DECLINED',
    ],
    }, { transaction: t })
  ])),

  down: (queryInterface) => queryInterface.sequelize.transaction((t) => Promise.all([
    queryInterface.removeColumn('Donations', 'paypal_onboarding_status', { transaction: t }),
  ])),
};