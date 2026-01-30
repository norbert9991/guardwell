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
// Changed to avoid MySQL "Too many keys" error from repeated alter syncs
const syncDatabase = async (force = false) => {
    try {
        // Only use alter: true when FORCE_DB_SYNC env var is set
        // This prevents the "too many keys" error from repeated deployments
        const shouldAlter = process.env.FORCE_DB_SYNC === 'true';

        if (shouldAlter) {
            console.log('⚠️ Force sync enabled - altering tables');
            await sequelize.sync({ alter: true });
        } else {
            // Normal sync - creates tables if they don't exist but won't alter
            await sequelize.sync();

            // Manually ensure new Alert columns exist (for the emergency queue feature)
            try {
                const queryInterface = sequelize.getQueryInterface();
                const alertColumns = await queryInterface.describeTable('alerts');

                // Add new columns if they don't exist
                if (!alertColumns.assignedTo) {
                    await queryInterface.addColumn('alerts', 'assignedTo', {
                        type: require('sequelize').DataTypes.STRING(100),
                        allowNull: true
                    });
                    console.log('✅ Added assignedTo column to alerts');
                }
                if (!alertColumns.priority) {
                    await queryInterface.addColumn('alerts', 'priority', {
                        type: require('sequelize').DataTypes.INTEGER,
                        defaultValue: 3
                    });
                    console.log('✅ Added priority column to alerts');
                }
                if (!alertColumns.responseNotes) {
                    await queryInterface.addColumn('alerts', 'responseNotes', {
                        type: require('sequelize').DataTypes.TEXT,
                        allowNull: true
                    });
                    console.log('✅ Added responseNotes column to alerts');
                }
                if (!alertColumns.voiceCommand) {
                    await queryInterface.addColumn('alerts', 'voiceCommand', {
                        type: require('sequelize').DataTypes.STRING(50),
                        allowNull: true
                    });
                    console.log('✅ Added voiceCommand column to alerts');
                }
                if (!alertColumns.latitude) {
                    await queryInterface.addColumn('alerts', 'latitude', {
                        type: require('sequelize').DataTypes.DECIMAL(10, 8),
                        allowNull: true
                    });
                    console.log('✅ Added latitude column to alerts');
                }
                if (!alertColumns.longitude) {
                    await queryInterface.addColumn('alerts', 'longitude', {
                        type: require('sequelize').DataTypes.DECIMAL(11, 8),
                        allowNull: true
                    });
                    console.log('✅ Added longitude column to alerts');
                }

                // IMPORTANT: Change status/type/severity from ENUM to VARCHAR if needed
                // This allows new status values like 'Responding' to work
                try {
                    // MySQL requires different syntax to modify column types
                    await sequelize.query(`
                        ALTER TABLE alerts 
                        MODIFY COLUMN status VARCHAR(20) DEFAULT 'Pending'
                    `);
                    console.log('✅ Changed status column to VARCHAR');
                } catch (alterErr) {
                    // Column might already be VARCHAR or other issue
                    if (!alterErr.message.includes('Unknown column')) {
                        console.log('Note: Status column modification:', alterErr.message);
                    }
                }

                try {
                    await sequelize.query(`
                        ALTER TABLE alerts 
                        MODIFY COLUMN type VARCHAR(50) NOT NULL
                    `);
                    console.log('✅ Changed type column to VARCHAR');
                } catch (alterErr) {
                    console.log('Note: Type column modification:', alterErr.message);
                }

                try {
                    await sequelize.query(`
                        ALTER TABLE alerts 
                        MODIFY COLUMN severity VARCHAR(20) NOT NULL
                    `);
                    console.log('✅ Changed severity column to VARCHAR');
                } catch (alterErr) {
                    console.log('Note: Severity column modification:', alterErr.message);
                }

            } catch (colError) {
                // Table might not exist yet, which is fine - sync() will create it
                if (!colError.message.includes('doesn\'t exist')) {
                    console.log('Note: Could not check/add Alert columns:', colError.message);
                }
            }
        }

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
