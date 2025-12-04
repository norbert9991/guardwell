const Worker = require('./Worker');
const Device = require('./Device');
const SensorData = require('./SensorData');
const Alert = require('./Alert');
const Incident = require('./Incident');
const EmergencyContact = require('./EmergencyContact');
const { sequelize } = require('../config/database');

// Define associations
Worker.hasOne(Device, { foreignKey: 'workerId', as: 'device' });
Device.belongsTo(Worker, { foreignKey: 'workerId', as: 'worker' });

Worker.hasMany(Alert, { foreignKey: 'workerId', as: 'alerts' });
Alert.belongsTo(Worker, { foreignKey: 'workerId', as: 'worker' });

Worker.hasMany(Incident, { foreignKey: 'workerId', as: 'incidents' });
Incident.belongsTo(Worker, { foreignKey: 'workerId', as: 'worker' });

// Sync all models with the database
const syncDatabase = async (force = false) => {
    try {
        await sequelize.sync({ force });
        console.log('✅ All models synchronized successfully.');
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
    syncDatabase
};
