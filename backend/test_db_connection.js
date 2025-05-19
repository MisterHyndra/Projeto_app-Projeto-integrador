const { Pool } = require('pg');

// Lista de senhas comuns para testar
const passwords = [
  'postgres',
  'admin',
  'password',
  'root',
  '1234',
  '12345',
  'neuro',
  ''  // senha vazia
];

async function testConnection(password) {
  const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'AppProject',
    password: password,
    port: 5432,
  });

  try {
    const client = await pool.connect();
    console.log(`✅ Conexão bem-sucedida com a senha: "${password}"`);
    client.release();
    return true;
  } catch (err) {
    console.log(`❌ Falha na conexão com a senha: "${password}"`);
    return false;
  } finally {
    pool.end();
  }
}

async function testAllPasswords() {
  console.log('Testando conexões com o PostgreSQL...');
  
  for (const password of passwords) {
    const success = await testConnection(password);
    if (success) {
      console.log('\nSenha encontrada! Atualize seu arquivo .env com esta senha.');
      break;
    }
  }
}

testAllPasswords();
