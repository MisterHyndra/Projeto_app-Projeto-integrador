const { sequelize } = require('./server');

async function fixForeignKeys() {
  try {
    await sequelize.authenticate();
    console.log('Conexão com o banco de dados estabelecida com sucesso.');

    // Remover a chave estrangeira duplicada (a que aponta para 'Users' com U maiúsculo)
    await sequelize.query(
      `ALTER TABLE emergency_contacts 
       DROP CONSTRAINT IF EXISTS "emergency_contacts_user_id_fkey";`
    );

    console.log('Chave estrangeira duplicada removida com sucesso!');
  } catch (error) {
    console.error('Erro ao corrigir as chaves estrangeiras:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

fixForeignKeys();
