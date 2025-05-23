const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuração do transporte de e-mail
const transporter = nodemailer.createTransport({
  service: 'gmail', // ou outro serviço de e-mail
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Envia um e-mail de notificação para o contato de emergência
 * @param {string} toEmail - E-mail do destinatário
 * @param {string} contactName - Nome do contato de emergência
 * @param {string} userName - Nome do usuário que esqueceu o medicamento
 * @param {string} medicationName - Nome do medicamento
 * @param {string} scheduledTime - Horário programado para o medicamento
 * @returns {Promise<boolean>} - Retorna true se o e-mail for enviado com sucesso
 */
const sendMissedMedicationAlert = async (toEmail, contactName, userName, medicationName, scheduledTime) => {
  try {
    if (!toEmail) {
      console.error('Nenhum e-mail de destinatário fornecido');
      return false;
    }

    const mailOptions = {
      from: `"Sistema de Lembretes de Medicamentos" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `⚠️ ${userName} esqueceu de tomar o medicamento`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #e74c3c;">Alerta de Medicamento Não Tomado</h2>
          
          <p>Olá <strong>${contactName}</strong>,</p>
          
          <p>Este é um alerta para informar que <strong>${userName}</strong> não tomou o seguinte medicamento no horário programado:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Medicamento:</strong> ${medicationName}</p>
            <p style="margin: 5px 0;"><strong>Horário programado:</strong> ${new Date(scheduledTime).toLocaleString('pt-BR')}</p>
          </div>
          
          <p>Por favor, entre em contato com ${userName} para verificar se está tudo bem.</p>
          
          <p>Atenciosamente,<br>Equipe de Suporte</p>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          
          <p style="font-size: 12px; color: #7f8c8d;">
            Esta é uma mensagem automática. Por favor, não responda este e-mail.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('E-mail de alerta enviado:', info.messageId);
    return true;
  } catch (error) {
    console.error('Erro ao enviar e-mail de alerta:', error);
    return false;
  }
};

module.exports = {
  sendMissedMedicationAlert,
};
