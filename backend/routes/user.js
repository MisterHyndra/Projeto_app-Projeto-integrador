const express = require('express');
const router = express.Router();
const User = require('../models/user');
const EmergencyContact = require('../models/emergencyContact');
const authMiddleware = require('../middlewares/auth');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// Obter perfil do usuário
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['senha'] }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Erro ao obter perfil do usuário:', error);
    res.status(500).json({ message: 'Erro ao obter perfil do usuário' });
  }
});

// Atualizar perfil do usuário
router.put('/profile', async (req, res) => {
  try {
    const { nome, telefone, dataNascimento, genero, altura, peso, alergias, condicoesMedicas } = req.body;
    
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Atualizar campos
    await user.update({
      nome: nome || user.nome,
      telefone: telefone || user.telefone,
      dataNascimento: dataNascimento || user.dataNascimento,
      genero: genero || user.genero,
      altura: altura || user.altura,
      peso: peso || user.peso,
      alergias: alergias || user.alergias,
      condicoesMedicas: condicoesMedicas || user.condicoesMedicas
    });
    
    // Retornar usuário atualizado sem a senha
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['senha'] }
    });
    
    res.status(200).json({
      message: 'Perfil atualizado com sucesso',
      user: updatedUser
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil do usuário:', error);
    res.status(500).json({ message: 'Erro ao atualizar perfil do usuário' });
  }
});

// Alterar senha
router.put('/change-password', async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body;
    
    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ message: 'Senha atual e nova senha são obrigatórias' });
    }
    
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar senha atual
    const senhaCorreta = await user.verificarSenha(senhaAtual);
    if (!senhaCorreta) {
      return res.status(401).json({ message: 'Senha atual incorreta' });
    }
    
    // Atualizar senha
    await user.update({ senha: novaSenha });
    
    res.status(200).json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ message: 'Erro ao alterar senha' });
  }
});

// Obter contatos de emergência
router.get('/emergency-contacts', async (req, res) => {
  try {
    const contacts = await EmergencyContact.findAll({
      where: { userId: req.user.id },
      order: [['isPrimary', 'DESC'], ['createdAt', 'ASC']]
    });
    
    res.status(200).json(contacts);
  } catch (error) {
    console.error('Erro ao obter contatos de emergência:', error);
    res.status(500).json({ message: 'Erro ao obter contatos de emergência' });
  }
});

// Adicionar contato de emergência
router.post('/emergency-contacts', async (req, res) => {
  try {
    console.log('Adicionando contato de emergência para o usuário ID:', req.user.id);
    console.log('Dados recebidos:', req.body);
    
    const { nome, telefone, relacao, email, isPrimary } = req.body;
    
    if (!nome || !telefone) {
      return res.status(400).json({ message: 'Nome e telefone são obrigatórios' });
    }
    
    // Verificar se o usuário existe
    const user = await User.findByPk(req.user.id);
    if (!user) {
      console.error('Usuário não encontrado com ID:', req.user.id);
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Se este for definido como primário, remover o status primário de outros contatos
    if (isPrimary) {
      await EmergencyContact.update(
        { isPrimary: false },
        { where: { userId: req.user.id, isPrimary: true } }
      );
    }
    
    console.log('Criando contato de emergência para o usuário ID:', req.user.id);
    
    const contact = await EmergencyContact.create({
      userId: req.user.id,
      nome,
      telefone,
      relacao,
      email,
      isPrimary: isPrimary || false
    });
    
    console.log('Contato de emergência criado com sucesso:', contact.toJSON());
    
    res.status(201).json({
      message: 'Contato de emergência adicionado com sucesso',
      contact
    });
  } catch (error) {
    console.error('Erro ao adicionar contato de emergência:', error);
    res.status(500).json({ message: 'Erro ao adicionar contato de emergência' });
  }
});

// Atualizar contato de emergência
router.put('/emergency-contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, telefone, relacao, email, isPrimary } = req.body;
    
    const contact = await EmergencyContact.findOne({
      where: { id, userId: req.user.id }
    });
    
    if (!contact) {
      return res.status(404).json({ message: 'Contato de emergência não encontrado' });
    }
    
    // Se este for definido como primário, remover o status primário de outros contatos
    if (isPrimary && !contact.isPrimary) {
      await EmergencyContact.update(
        { isPrimary: false },
        { where: { userId: req.user.id, isPrimary: true } }
      );
    }
    
    await contact.update({
      nome: nome || contact.nome,
      telefone: telefone || contact.telefone,
      relacao: relacao !== undefined ? relacao : contact.relacao,
      email: email !== undefined ? email : contact.email,
      isPrimary: isPrimary !== undefined ? isPrimary : contact.isPrimary
    });
    
    res.status(200).json({
      message: 'Contato de emergência atualizado com sucesso',
      contact
    });
  } catch (error) {
    console.error('Erro ao atualizar contato de emergência:', error);
    res.status(500).json({ message: 'Erro ao atualizar contato de emergência' });
  }
});

// Excluir contato de emergência
router.delete('/emergency-contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const contact = await EmergencyContact.findOne({
      where: { id, userId: req.user.id }
    });
    
    if (!contact) {
      return res.status(404).json({ message: 'Contato de emergência não encontrado' });
    }
    
    await contact.destroy();
    
    res.status(200).json({ message: 'Contato de emergência excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir contato de emergência:', error);
    res.status(500).json({ message: 'Erro ao excluir contato de emergência' });
  }
});

module.exports = router;
