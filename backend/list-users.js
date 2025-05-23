const { sequelize } = require('./server');
const User = require('./models/user');

async function listUsers() {
  try {
    await sequelize.authenticate();
    console.log('Conexão com o banco de dados estabelecida com sucesso.');
    
    const users = await User.findAll({
      attributes: ['id', 'nome', 'email', 'createdAt', 'updatedAt']
    });
    
    console.log('Usuários encontrados:', users.map(u => u.toJSON()));
    
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
  } finally {
    await sequelize.close();
  }
}

listUsers();
