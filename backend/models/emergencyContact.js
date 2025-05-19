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
    references: {
      model: 'Users',
      key: 'id'
    }
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
    defaultValue: false
  }
});

module.exports = EmergencyContact;
