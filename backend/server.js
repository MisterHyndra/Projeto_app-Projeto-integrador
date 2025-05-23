require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Sequelize, Op } = require('sequelize');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuração do banco de dados
// Configuração do Sequelize para forçar nomes de tabelas em minúsculas
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: console.log, // Ativar logs para depuração
    define: {
      timestamps: true,
      freezeTableName: true, // Usar nomes de tabelas exatamente como definidos
      underscored: true, // Usar snake_case para nomes de colunas
    },
    // Desativar a conversão de nomes para minúsculas
    quoteIdentifiers: false,
    // Desativar a transformação de nomes de colunas
    caseModel: 'pascal', // Manter o nome do modelo como está
    caseFile: 'pascal', // Manter o nome do arquivo como está
    quoteTableName: true // Forçar o uso de aspas nos nomes das tabelas
  }
);

// Exportar sequelize para uso nos modelos
module.exports = { sequelize, Op };

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexão com o banco de dados estabelecida com sucesso.');
  } catch (error) {
    console.error('Não foi possível conectar ao banco de dados:', error);
  }
};

// Importar modelos após exportar sequelize
const User = require('./models/user');
const Medication = require('./models/medication');
const MedicationLog = require('./models/medicationLog');
const EmergencyContact = require('./models/emergencyContact');

// Definir associações entre modelos
User.hasMany(Medication, { foreignKey: 'user_id' });
Medication.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(MedicationLog, { foreignKey: 'user_id' });
MedicationLog.belongsTo(User, { foreignKey: 'user_id' });

Medication.hasMany(MedicationLog, { foreignKey: 'medication_id' });
MedicationLog.belongsTo(Medication, { foreignKey: 'medication_id' });

User.hasMany(EmergencyContact, { foreignKey: 'user_id' });
EmergencyContact.belongsTo(User, { foreignKey: 'user_id' });

// Importar rotas
const userRoutes = require('./routes/user');
const medicationRoutes = require('./routes/medication');
const authRoutes = require('./routes/auth');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Testar conexão com o banco de dados
testConnection();

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/notifications', notificationRoutes);

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: 'API MedAlerta funcionando!' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log('Rotas disponíveis:');
  console.log('GET / - Teste da API');
  console.log('POST /api/auth/register - Registro de usuário');
  console.log('POST /api/auth/login - Login de usuário');
  console.log('GET /api/users/profile - Obter perfil do usuário');
  console.log('PUT /api/users/profile - Atualizar perfil do usuário');
  console.log('GET /api/medications - Listar medicamentos');
  console.log('POST /api/medications - Adicionar medicamento');
});

// Sincronizar modelos com o banco de dados
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('Modelos sincronizados com o banco de dados');
  } catch (error) {
    console.error('Erro ao sincronizar modelos:', error);
  }
};

syncDatabase();
