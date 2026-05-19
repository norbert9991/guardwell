require('dotenv').config();
const { Sequelize } = require('sequelize');

// Railway MySQL connection
const sequelize = new Sequelize(
    process.env.MYSQL_DATABASE || 'guardwell',
    process.env.MYSQL_USER || 'root',
    process.env.MYSQL_PASSWORD || '',
    {
        host: process.env.MYSQL_HOST || 'localhost',
        port: process.env.MYSQL_PORT || 3306,
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        dialectOptions: process.env.NODE_ENV === 'production' ? {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        } : {}
    }
);

// Test connection
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ MySQL connection established successfully.');
    } catch (error) {
        console.error('❌ Unable to connect to MySQL:', error);
    }
};

module.exports = { sequelize, testConnection };
