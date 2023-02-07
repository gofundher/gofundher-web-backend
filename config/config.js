require('dotenv').config();

const {
  DB_USERNAME,
  DB_USERNAME_PRODUCTION,
  DB_PASSWORD,
  DB_PASSWORD_PRODUCTION,
  DB_NAME,
  DB_NAME_PRODUCTION,
  DB_HOST,
  DB_HOST_PRODUCTION,
} = process.env;

module.exports = {
  development: {
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_NAME,
    host: DB_HOST,
    dialect: "mysql",
    operatorsAliases: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
  production: {
    username: DB_USERNAME_PRODUCTION,
    password: DB_PASSWORD_PRODUCTION,
    database: DB_NAME_PRODUCTION,
    host: DB_HOST_PRODUCTION,
    dialect: "mysql",
    operatorsAliases: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
};
