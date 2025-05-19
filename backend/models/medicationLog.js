const { DataTypes } = require('sequelize');
const { sequelize } = require('../server');

const MedicationLog = sequelize.define('MedicationLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  medicationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Medications',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  scheduledTime: {
    type: DataTypes.STRING,
    allowNull: false
  },
  takenAt: {
    type: DataTypes.DATE
  },
  missedAt: {
    type: DataTypes.DATE
  },
  status: {
    type: DataTypes.ENUM('taken', 'missed', 'scheduled'),
    defaultValue: 'scheduled'
  },
  notes: {
    type: DataTypes.TEXT
  }
});

module.exports = MedicationLog;
