const { DataTypes } = require('sequelize');
const { sequelize } = require('../server');

const EmergencyContact = sequelize.define('EmergencyContact', {
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
      model: {
        tableName: 'users',
        schema: 'public'
      },
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: false
  },
  telefone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  relacao: {
    type: DataTypes.STRING
  },
  email: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true
    }
  },
  isPrimary: {
    type: DataTypes.BOOLEAN,
    field: 'is_primary',
    defaultValue: false
  }
}, {
  tableName: 'emergency_contacts',
  freezeTableName: true,
  timestamps: true,
  underscored: true
});

module.exports = EmergencyContact;
