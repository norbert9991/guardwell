const Worker = require('./Worker');
const Device = require('./Device');
const SensorData = require('./SensorData');
const Alert = require('./Alert');
const Incident = require('./Incident');
const EmergencyContact = require('./EmergencyContact');
const User = require('./User');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');

// Define associations
Worker.hasOne(Device, { foreignKey: 'workerId', as: 'device' });
Device.belongsTo(Worker, { foreignKey: 'workerId', as: 'worker' });

Worker.hasMany(Alert, { foreignKey: 'workerId', as: 'alerts' });
Alert.belongsTo(Worker, { foreignKey: 'workerId', as: 'worker' });

Worker.hasMany(Incident, { foreignKey: 'workerId', as: 'incidents' });
Incident.belongsTo(Worker, { foreignKey: 'workerId', as: 'worker' });

// Sync all models with the database
// Using alter: true to add new columns without dropping existing data
const syncDatabase = async (force = false) => {
    try {
        // alter: true will add new columns to existing tables
        // force: true would drop and recreate (only use in development)
        await sequelize.sync({ alter: true });
        console.log('✅ All models synchronized successfully.');

        // Create default Head Admin if none exists
        const adminExists = await User.findOne({ where: { role: 'Head Admin' } });
        if (!adminExists) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('HeadAdmin@2024', salt);

            await User.create({
                email: 'admin@guardwell.com',
                password: hashedPassword,
                fullName: 'Head Administrator',
                role: 'Head Admin',
                department: 'Administration',
                status: 'Active'
            }, { hooks: false }); // Skip hooks since we already hashed

            console.log('✅ Default Head Admin created: admin@guardwell.com');
        }
    } catch (error) {
        console.error('❌ Error synchronizing models:', error);
    }
};

module.exports = {
    Worker,
    Device,
    SensorData,
    Alert,
    Incident,
    EmergencyContact,
    User,
    syncDatabase
};
