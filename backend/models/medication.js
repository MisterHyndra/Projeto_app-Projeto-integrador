const { DataTypes } = require('sequelize');
const { sequelize } = require('../server');

const Medication = sequelize.define('medication', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
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
    allowNull: false,
    field: 'time_of_day'
  },
  daysOfWeek: {
    type: DataTypes.JSON,
    field: 'days_of_week'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.DATE,
    field: 'end_date'
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
}, {
  tableName: 'medications',
  freezeTableName: true,
  timestamps: true,
  underscored: true,
  classMethods: {
    associate: function(models) {
      Medication.belongsTo(models.User, { foreignKey: 'user_id' });
      Medication.hasMany(models.MedicationLog, { foreignKey: 'medication_id' });
    }
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

module.exports = Medication;
