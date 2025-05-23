require('dotenv').config();
const { sendMissedMedicationAlert } = require('./services/emailService');

async function testEmail() {
  try {
    console.log('Iniciando teste de envio de e-mail...');
    
    const result = await sendMissedMedicationAlert(
      'seu-email@exemplo.com', // Substitua pelo e-mail de teste
      'Nome do Contato',
      'Nome do Usuário',
      'Paracetamol 500mg',
      new Date().toISOString()
    );

    if (result) {
      console.log('✅ E-mail enviado com sucesso!');
    } else {
      console.log('❌ Falha ao enviar e-mail');
    }
  } catch (error) {
    console.error('Erro durante o teste de e-mail:', error);
  }
}

testEmail();
