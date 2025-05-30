const EmergencyContact = require('../models/emergencyContact');
const User = require('../models/user');
const { sendMissedMedicationAlert } = require('../services/emailService');
const { sendMissedMedicationSMS } = require('../services/smsService');

/**
 * Notifica os contatos de emergência sobre um medicamento não tomado
 * @param {number} userId - ID do usuário que esqueceu o medicamento
 * @param {string} medicationName - Nome do medicamento não tomado
 * @param {string} scheduledTime - Horário programado para o medicamento
 * @returns {Promise<{success: boolean, message: string}>}
 */
const notifyEmergencyContacts = async (userId, medicationName, scheduledTime) => {
  try {
    // 1. Obter os contatos de emergência do usuário
    const contacts = await EmergencyContact.findAll({
      where: { userId },
      order: [['isPrimary', 'DESC']], // Prioriza contatos primários
    });

    if (contacts.length === 0) {
      console.log('Nenhum contato de emergência encontrado para notificação');
      return { success: false, message: 'Nenhum contato de emergência cadastrado' };
    }

    // 2. Obter informações do usuário
    const user = await User.findByPk(userId, {
      attributes: ['id', 'nome', 'email'],
    });

    if (!user) {
      console.error('Usuário não encontrado para notificação');
      return { success: false, message: 'Usuário não encontrado' };
    }

    // 3. Enviar notificação para cada contato
    const notificationPromises = contacts.map(async (contact) => {
      const notificationResult = {
        contactId: contact.id,
        contactName: contact.nome,
        email: contact.email,
        phone: contact.telefone,
        emailSent: false,
        smsSent: false,
        errors: []
      };

      try {
        // Enviar e-mail se o contato tiver e-mail
        if (contact.email) {
          try {
            const emailSent = await sendMissedMedicationAlert(
              contact.email,
              contact.nome,
              user.nome,
              medicationName,
              scheduledTime
            );
            notificationResult.emailSent = emailSent;
            if (!emailSent) {
              notificationResult.errors.push('Falha ao enviar e-mail');
            }
          } catch (emailError) {
            console.error(`Erro ao enviar e-mail para ${contact.id}:`, emailError);
            notificationResult.errors.push(`Erro no e-mail: ${emailError.message}`);
          }
        }

        // Enviar SMS se o contato tiver telefone
        if (contact.telefone) {
          try {
            // Remover caracteres não numéricos e adicionar o código do país se necessário
            let phoneNumber = contact.telefone.replace(/\D/g, '');
            if (!phoneNumber.startsWith('+') && !phoneNumber.startsWith('55')) {
              phoneNumber = `55${phoneNumber}`; // Adiciona código do Brasil
            }
            if (!phoneNumber.startsWith('+')) {
              phoneNumber = `+${phoneNumber}`; // Adiciona o sinal de +
            }
            
            const smsResult = await sendMissedMedicationSMS(
              phoneNumber,
              contact.nome,
              user.nome,
              medicationName,
              scheduledTime
            );
            notificationResult.smsSent = smsResult.success;
            if (!smsResult.success) {
              notificationResult.errors.push(`Falha no SMS: ${smsResult.message}`);
            }
          } catch (smsError) {
            console.error(`Erro ao enviar SMS para ${contact.id}:`, smsError);
            notificationResult.errors.push(`Erro no SMS: ${smsError.message}`);
          }
        }

        // Considera a notificação como bem-sucedida se pelo menos um método funcionou
        notificationResult.success = notificationResult.emailSent || notificationResult.smsSent;

        return notificationResult;
      } catch (error) {
        console.error(`Erro ao processar notificação para contato ${contact.id}:`, error);
        notificationResult.errors.push(`Erro geral: ${error.message}`);
        notificationResult.success = false;
        return notificationResult;
      }
    });

    // Aguarda todas as notificações serem processadas
    const results = await Promise.all(notificationPromises);
    
    // Verifica se pelo menos uma notificação foi enviada com sucesso
    const anySuccess = results.some(result => result.success);
    
    if (anySuccess) {
      return { 
        success: true, 
        message: 'Contatos de emergência notificados com sucesso',
        details: results,
      };
    } else {
      return { 
        success: false, 
        message: 'Falha ao notificar contatos de emergência',
        details: results,
      };
    }
  } catch (error) {
    console.error('Erro ao processar notificações de emergência:', error);
    return { 
      success: false, 
      message: 'Erro ao processar notificações de emergência',
      error: error.message,
    };
  }
};

/**
 * Rota de teste para envio de SMS
 * @route GET /api/notifications/test-sms
 * @param {Object} req - Requisição HTTP
 * @param {Object} res - Resposta HTTP
 */
const testSMS = async (req, res) => {
  try {
    const { phoneNumber } = req.query;
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Número de telefone é obrigatório (use ?phoneNumber=+5511999999999)' 
      });
    }

    const result = await sendMissedMedicationSMS(
      phoneNumber,
      'Contato de Teste',
      'Usuário de Teste',
      'Paracetamol 500mg',
      new Date().toISOString()
    );

    if (result.success) {
      return res.json({
        success: true,
        message: 'SMS de teste enviado com sucesso!',
        sid: result.sid
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Falha ao enviar SMS de teste',
        error: result.message
      });
    }
  } catch (error) {
    console.error('Erro no teste de SMS:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar teste de SMS',
      error: error.message
    });
  }
};

module.exports = {
  notifyEmergencyContacts,
  testSMS
};
