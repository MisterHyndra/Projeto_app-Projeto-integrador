const { sequelize } = require('./server');
const User = require('./models/user');

async function checkUser() {
  try {
    await sequelize.authenticate();
    console.log('Conexão com o banco de dados estabelecida com sucesso.');
    
    // Verificar se o usuário com ID 1 existe
    const user = await User.findByPk(1);
    
    if (user) {
      console.log('Usuário encontrado:', user.toJSON());
    } else {
      console.log('Usuário com ID 1 não encontrado.');
      
      // Listar todos os usuários
      const allUsers = await User.findAll();
      console.log('Todos os usuários no banco de dados:');
      allUsers.forEach(u => console.log(u.toJSON()));
    }
    
  } catch (error) {
    console.error('Erro ao verificar usuário:', error);
  } finally {
    await sequelize.close();
  }
}

checkUser();
