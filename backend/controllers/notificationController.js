const EmergencyContact = require('../models/emergencyContact');
const User = require('../models/user');
const { sendMissedMedicationAlert } = require('../services/emailService');

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

    // 3. Enviar notificação para cada contato com e-mail válido
    const notificationPromises = contacts
      .filter(contact => contact.email) // Filtra apenas contatos com e-mail
      .map(async (contact) => {
        try {
          const emailSent = await sendMissedMedicationAlert(
            contact.email,
            contact.nome,
            user.nome,
            medicationName,
            scheduledTime
          );
          
          return {
            contactId: contact.id,
            contactName: contact.nome,
            email: contact.email,
            success: emailSent,
          };
        } catch (error) {
          console.error(`Erro ao notificar contato ${contact.id}:`, error);
          return {
            contactId: contact.id,
            contactName: contact.nome,
            email: contact.email,
            success: false,
            error: error.message,
          };
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

module.exports = {
  notifyEmergencyContacts,
};
