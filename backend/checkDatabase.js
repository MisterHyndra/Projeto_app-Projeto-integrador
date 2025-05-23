const { sequelize } = require('./server');
const { QueryTypes } = require('sequelize');

async function checkDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Conexão com o banco de dados estabelecida com sucesso.');

    // Verificar tabelas existentes
    const tables = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';",
      { type: QueryTypes.SELECT }
    );
    console.log('Tabelas no banco de dados:');
    console.log(tables.map(t => t.table_name).join(', '));

    // Verificar estrutura da tabela users
    console.log('\nEstrutura da tabela users:');
    const usersColumns = await sequelize.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users';",
      { type: QueryTypes.SELECT }
    );
    console.table(usersColumns);

    // Verificar estrutura da tabela emergency_contacts
    console.log('\nEstrutura da tabela emergency_contacts:');
    const emergencyContactsColumns = await sequelize.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'emergency_contacts';",
      { type: QueryTypes.SELECT }
    );
    console.table(emergencyContactsColumns);

    // Verificar chaves estrangeiras
    console.log('\nChaves estrangeiras da tabela emergency_contacts:');
    const foreignKeys = await sequelize.query(
      `SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE
        tc.constraint_type = 'FOREIGN KEY' AND
        tc.table_name = 'emergency_contacts';`,
      { type: QueryTypes.SELECT }
    );
    console.table(foreignKeys);

    // Verificar dados na tabela users
    console.log('\nDados na tabela users:');
    const users = await sequelize.query('SELECT id, nome, email FROM users;', { type: QueryTypes.SELECT });
    console.table(users);

  } catch (error) {
    console.error('Erro ao verificar o banco de dados:', error);
  } finally {
    await sequelize.close();
  }
}

checkDatabase();
