const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Medication = require('../models/medication');
const MedicationLog = require('../models/medicationLog');
const authMiddleware = require('../middlewares/auth');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// Obter todos os medicamentos do usuário
router.get('/', async (req, res) => {
  try {
    const medications = await Medication.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json(medications);
  } catch (error) {
    console.error('Erro ao obter medicamentos:', error);
    res.status(500).json({ message: 'Erro ao obter medicamentos' });
  }
});

// Obter um medicamento específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const medication = await Medication.findOne({
      where: { id, userId: req.user.id }
    });
    
    if (!medication) {
      return res.status(404).json({ message: 'Medicamento não encontrado' });
    }
    
    res.status(200).json(medication);
  } catch (error) {
    console.error('Erro ao obter medicamento:', error);
    res.status(500).json({ message: 'Erro ao obter medicamento' });
  }
});

// Adicionar um novo medicamento
router.post('/', async (req, res) => {
  try {
    const { 
      name, 
      dosage, 
      frequency, 
      timeOfDay, 
      daysOfWeek, 
      startDate, 
      endDate, 
      instructions, 
      color 
    } = req.body;
    
    // Validar campos obrigatórios
    if (!name || !dosage || !frequency || !timeOfDay || !startDate) {
      return res.status(400).json({ 
        message: 'Campos obrigatórios: nome, dosagem, frequência, horários e data de início' 
      });
    }
    
    const medication = await Medication.create({
      userId: req.user.id,
      name,
      dosage,
      frequency,
      timeOfDay,
      daysOfWeek: daysOfWeek || null,
      startDate,
      endDate: endDate || null,
      instructions: instructions || null,
      color: color || '#4A90E2'
    });
    
    res.status(201).json({
      message: 'Medicamento adicionado com sucesso',
      medication
    });
  } catch (error) {
    console.error('Erro ao adicionar medicamento:', error);
    res.status(500).json({ message: 'Erro ao adicionar medicamento' });
  }
});

// Atualizar um medicamento
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      dosage, 
      frequency, 
      timeOfDay, 
      daysOfWeek, 
      startDate, 
      endDate, 
      instructions, 
      color,
      active
    } = req.body;
    
    const medication = await Medication.findOne({
      where: { id, userId: req.user.id }
    });
    
    if (!medication) {
      return res.status(404).json({ message: 'Medicamento não encontrado' });
    }
    
    await medication.update({
      name: name || medication.name,
      dosage: dosage || medication.dosage,
      frequency: frequency || medication.frequency,
      timeOfDay: timeOfDay || medication.timeOfDay,
      daysOfWeek: daysOfWeek !== undefined ? daysOfWeek : medication.daysOfWeek,
      startDate: startDate || medication.startDate,
      endDate: endDate !== undefined ? endDate : medication.endDate,
      instructions: instructions !== undefined ? instructions : medication.instructions,
      color: color || medication.color,
      active: active !== undefined ? active : medication.active
    });
    
    res.status(200).json({
      message: 'Medicamento atualizado com sucesso',
      medication
    });
  } catch (error) {
    console.error('Erro ao atualizar medicamento:', error);
    res.status(500).json({ message: 'Erro ao atualizar medicamento' });
  }
});

// Excluir um medicamento
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const medication = await Medication.findOne({
      where: { id, userId: req.user.id }
    });
    
    if (!medication) {
      return res.status(404).json({ message: 'Medicamento não encontrado' });
    }
    
    await medication.destroy();
    
    res.status(200).json({ message: 'Medicamento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir medicamento:', error);
    res.status(500).json({ message: 'Erro ao excluir medicamento' });
  }
});

// Registrar medicamento tomado
router.post('/:id/taken', async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledTime, notes } = req.body;
    
    if (!scheduledTime) {
      return res.status(400).json({ message: 'Horário agendado é obrigatório' });
    }
    
    const medication = await Medication.findOne({
      where: { id, userId: req.user.id }
    });
    
    if (!medication) {
      return res.status(404).json({ message: 'Medicamento não encontrado' });
    }
    
    const log = await MedicationLog.create({
      medicationId: id,
      userId: req.user.id,
      scheduledTime,
      takenAt: new Date(),
      status: 'taken',
      notes: notes || null
    });
    
    res.status(201).json({
      message: 'Medicamento registrado como tomado',
      log
    });
  } catch (error) {
    console.error('Erro ao registrar medicamento tomado:', error);
    res.status(500).json({ message: 'Erro ao registrar medicamento tomado' });
  }
});

// Registrar medicamento perdido
router.post('/:id/missed', async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledTime, notes } = req.body;
    
    if (!scheduledTime) {
      return res.status(400).json({ message: 'Horário agendado é obrigatório' });
    }
    
    const medication = await Medication.findOne({
      where: { id, userId: req.user.id }
    });
    
    if (!medication) {
      return res.status(404).json({ message: 'Medicamento não encontrado' });
    }
    
    const log = await MedicationLog.create({
      medicationId: id,
      userId: req.user.id,
      scheduledTime,
      missedAt: new Date(),
      status: 'missed',
      notes: notes || null
    });
    
    res.status(201).json({
      message: 'Medicamento registrado como perdido',
      log
    });
  } catch (error) {
    console.error('Erro ao registrar medicamento perdido:', error);
    res.status(500).json({ message: 'Erro ao registrar medicamento perdido' });
  }
});

// Obter histórico de um medicamento
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    
    const medication = await Medication.findOne({
      where: { id, userId: req.user.id }
    });
    
    if (!medication) {
      return res.status(404).json({ message: 'Medicamento não encontrado' });
    }
    
    const history = await MedicationLog.findAll({
      where: { medicationId: id, userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json(history);
  } catch (error) {
    console.error('Erro ao obter histórico do medicamento:', error);
    res.status(500).json({ message: 'Erro ao obter histórico do medicamento' });
  }
});

// Obter todo o histórico de medicamentos do usuário
router.get('/history/all', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let whereClause = { userId: req.user.id };
    
    // Adicionar filtro por data se fornecido
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    const history = await MedicationLog.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Medication,
          attributes: ['name', 'dosage', 'color']
        }
      ]
    });
    
    res.status(200).json(history);
  } catch (error) {
    console.error('Erro ao obter histórico de medicamentos:', error);
    res.status(500).json({ message: 'Erro ao obter histórico de medicamentos' });
  }
});

module.exports = router;
