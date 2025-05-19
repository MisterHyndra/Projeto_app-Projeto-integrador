require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Sequelize, Op } = require('sequelize');

// Configuração do banco de dados
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
    },
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
User.hasMany(Medication, { foreignKey: 'userId' });
Medication.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(MedicationLog, { foreignKey: 'userId' });
MedicationLog.belongsTo(User, { foreignKey: 'userId' });

Medication.hasMany(MedicationLog, { foreignKey: 'medicationId' });
MedicationLog.belongsTo(Medication, { foreignKey: 'medicationId' });

User.hasMany(EmergencyContact, { foreignKey: 'userId' });
EmergencyContact.belongsTo(User, { foreignKey: 'userId' });

// Rotas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const medicationRoutes = require('./routes/medication');

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
