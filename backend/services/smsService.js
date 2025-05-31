const twilio = require('twilio');
require('dotenv').config();

// Inicializa o cliente Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID || 'ACc0fd02b25ff4a46de3fa8d1288a5ca11',
  process.env.TWILIO_AUTH_TOKEN || 'ab42a0c7b077cb75e94f497d3f3aa20c'
);

/**
 * Envia um SMS de alerta para o contato de emergência
 * @param {string} toPhoneNumber - Número de telefone do destinatário (formato: +5511999999999)
 * @param {string} contactName - Nome do contato de emergência
 * @param {string} userName - Nome do usuário que esqueceu o medicamento
 * @param {string} medicationName - Nome do medicamento
 * @param {string} scheduledTime - Horário programado para o medicamento
 * @returns {Promise<{success: boolean, message: string, sid: string}>}
 */
const sendMissedMedicationSMS = async (toPhoneNumber, contactName, userName, medicationName, scheduledTime) => {
  try {
    if (!toPhoneNumber) {
      console.error('Nenhum número de telefone de destinatário fornecido');
      return { success: false, message: 'Número de telefone do destinatário não fornecido' };
    }
    
    // Validar nome do medicamento
    if (typeof medicationName !== 'string' || /^\d+$/.test(medicationName)) {
      console.error('Erro: Nome do medicamento inválido no SMS:', medicationName);
      return { 
        success: false, 
        message: 'Nome do medicamento inválido' 
      };
    }
    
    // Garantir que o nome do medicamento seja uma string válida
    const safeMedicationName = medicationName.trim() || 'um medicamento';

    // Mensagem super curta para teste
    const shortName = userName.split(' ')[0]; // Pega apenas o primeiro nome
    const message = `${shortName} esqueceu o remédio`;

    // Envia o SMS usando a API da Twilio
    const messageResponse = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER || '+17177469562', // Seu número Twilio
      to: toPhoneNumber
    });

    console.log('SMS de alerta enviado com SID:', messageResponse.sid);
    return {
      success: true,
      message: 'SMS enviado com sucesso',
      sid: messageResponse.sid
    };
  } catch (error) {
    console.error('Erro ao enviar SMS de alerta:', error);
    return {
      success: false,
      message: `Erro ao enviar SMS: ${error.message}`,
      error: error
    };
  }
};

module.exports = {
  sendMissedMedicationSMS
};
