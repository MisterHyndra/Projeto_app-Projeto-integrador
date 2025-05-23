const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/auth');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

/**
 * @route   POST /api/notifications/medication-missed
 * @desc    Notifica contatos de emergência sobre medicamento não tomado
 * @access  Private
 * @body    {string} medicationName - Nome do medicamento não tomado
 * @body    {string} scheduledTime - Data/hora programada do medicamento (ISO string)
 */
router.post('/medication-missed', async (req, res) => {
  try {
    const { medicationName, scheduledTime } = req.body;
    const userId = req.user.id;

    if (!medicationName || !scheduledTime) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nome do medicamento e horário programado são obrigatórios' 
      });
    }

    const result = await notificationController.notifyEmergencyContacts(
      userId,
      medicationName,
      scheduledTime
    );

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Notificações enviadas com sucesso',
        details: result.details,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.message,
        details: result.details || result.error,
      });
    }
  } catch (error) {
    console.error('Erro na rota de notificação de medicamento perdido:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar notificação',
      error: error.message,
    });
  }
});

module.exports = router;
