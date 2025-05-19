const { DataTypes } = require('sequelize');
const { sequelize } = require('../server');

const Medication = sequelize.define('Medication', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dosage: {
    type: DataTypes.STRING,
    allowNull: false
  },
  frequency: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'daily'
  },
  timeOfDay: {
    type: DataTypes.JSON,
    allowNull: false
  },
  daysOfWeek: {
    type: DataTypes.JSON
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE
  },
  instructions: {
    type: DataTypes.TEXT
  },
  color: {
    type: DataTypes.STRING,
    defaultValue: '#4A90E2'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

module.exports = Medication;
