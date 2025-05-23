const { DataTypes } = require('sequelize');
const { sequelize } = require('../server');

const MedicationLog = sequelize.define('medication_log', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  medicationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'medication_id',
    references: {
      model: 'medications',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
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
  scheduledTime: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'scheduled_time'
  },
  takenAt: {
    type: DataTypes.DATE,
    field: 'taken_at'
  },
  missedAt: {
    type: DataTypes.DATE,
    field: 'missed_at'
  },
  status: {
    type: DataTypes.ENUM('taken', 'missed', 'scheduled'),
    defaultValue: 'scheduled'
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'medication_logs',
  freezeTableName: true,
  timestamps: true,
  underscored: true,
  classMethods: {
    associate: function(models) {
      MedicationLog.belongsTo(models.User, { foreignKey: 'user_id' });
      MedicationLog.belongsTo(models.Medication, { foreignKey: 'medication_id' });
    }
  }
});

module.exports = MedicationLog;
