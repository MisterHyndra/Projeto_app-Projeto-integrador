const axios = require('axios');

// Configuração da API
const api = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dados para login
const loginData = {
  email: 'daniel@gmail.com', // E-mail do usuário
  senha: '123456'           // Senha do usuário
};

// ID do usuário (pode ser obtido do banco de dados ou do login)
const userId = 1; // Substitua pelo ID do usuário se necessário

// Dados para teste de notificação
const testData = {
  medicationName: 'Paracetamol 500mg - Teste de Notificação',
  scheduledTime: new Date().toISOString(),
  // Adicionando e-mail de destino para o teste
  email: 'pvpnews2@gmail.com',
  // Adicionando o ID do usuário para a rota de notificação
  userId: userId
};

// Configuração do servidor SMTP para teste
console.log('Configuração do servidor de e-mail:');
console.log('- Servidor: smtp.gmail.com');
console.log('- Porta: 587');
console.log('- Usuário: medalertainfo@gmail.com');
console.log('- Remetente: "Sistema de Lembretes de Medicamentos" <medalertainfo@gmail.com>');
console.log('- Destinatário:', testData.email);

// Mostrar dados que serão enviados
console.log('Dados de login que serão usados:');
console.log('- E-mail:', loginData.email);
console.log('- Senha:', '*'.repeat(loginData.senha.length));
console.log('\nDados da notificação:');
console.log('- Medicamento:', testData.medicationName);
console.log('- Horário:', testData.scheduledTime);
console.log('\nIniciando teste...\n');

// Função para testar o envio de notificação
async function testNotification() {
  try {
    console.log('Iniciando teste de notificação...');
    
    // 1. Fazer login para obter o token
    console.log('Fazendo login...');
    const loginResponse = await api.post('/api/auth/login', loginData);
    
    if (!loginResponse.data.token) {
      throw new Error('Falha no login: Token não recebido');
    }
    
    const token = loginResponse.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('Login realizado com sucesso!');
    
    // 2. Enviar notificação
    console.log('\nEnviando notificação...');
    console.log('Dados:', testData);
    
    const response = await api.post('/api/notifications/medication-missed', testData);
    
    console.log('Resposta do servidor:');
    console.log(response.data);
    
    if (response.data.success) {
      console.log('✅ Notificação enviada com sucesso!');
      console.log('Detalhes:', response.data.details);
    } else {
      console.error('❌ Falha ao enviar notificação:', response.data.message);
    }
  } catch (error) {
    console.error('❌ Erro ao testar notificação:');
    if (error.response) {
      // A requisição foi feita e o servidor respondeu com um status fora do 2xx
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta
      console.error('Sem resposta do servidor. Verifique se o servidor está rodando.');
    } else {
      // Algum erro ocorreu ao montar a requisição
      console.error('Erro:', error.message);
    }
  }
}

// Executar o teste
testNotification();
