const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { sequelize } = require('../server');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  senha: {
    type: DataTypes.STRING,
    allowNull: false
  },
  telefone: {
    type: DataTypes.STRING
  },
  dataNascimento: {
    type: DataTypes.DATEONLY
  },
  genero: {
    type: DataTypes.STRING
  },
  altura: {
    type: DataTypes.FLOAT
  },
  peso: {
    type: DataTypes.FLOAT
  },
  alergias: {
    type: DataTypes.TEXT
  },
  condicoesMedicas: {
    type: DataTypes.TEXT
  }
}, {
  hooks: {
    beforeCreate: async (user) => {
      if (user.senha) {
        const salt = await bcrypt.genSalt(10);
        user.senha = await bcrypt.hash(user.senha, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('senha')) {
        const salt = await bcrypt.genSalt(10);
        user.senha = await bcrypt.hash(user.senha, salt);
      }
    }
  }
});

// Método para verificar senha
User.prototype.verificarSenha = async function(senha) {
  return await bcrypt.compare(senha, this.senha);
};

module.exports = User;
