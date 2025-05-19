const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Rota de registro
router.post('/register', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    // Verificar se o usuário já existe
    const usuarioExistente = await User.findOne({ where: { email } });
    if (usuarioExistente) {
      return res.status(400).json({ message: 'Email já cadastrado' });
    }

    // Criar o usuário
    const usuario = await User.create({
      nome,
      email,
      senha
    });

    // Remover a senha do objeto de resposta
    const usuarioSemSenha = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      createdAt: usuario.createdAt
    };

    // Gerar token JWT
    const token = jwt.sign(
      { id: usuario.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Usuário registrado com sucesso',
      user: usuarioSemSenha,
      token
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ message: 'Erro ao registrar usuário' });
  }
});

// Rota de login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Verificar se o usuário existe
    const usuario = await User.findOne({ where: { email } });
    if (!usuario) {
      return res.status(401).json({ message: 'Email ou senha inválidos' });
    }

    // Verificar a senha
    const senhaCorreta = await usuario.verificarSenha(senha);
    if (!senhaCorreta) {
      return res.status(401).json({ message: 'Email ou senha inválidos' });
    }

    // Remover a senha do objeto de resposta
    const usuarioSemSenha = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email
    };

    // Gerar token JWT
    const token = jwt.sign(
      { id: usuario.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login realizado com sucesso',
      user: usuarioSemSenha,
      token
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ message: 'Erro ao fazer login' });
  }
});

module.exports = router;
