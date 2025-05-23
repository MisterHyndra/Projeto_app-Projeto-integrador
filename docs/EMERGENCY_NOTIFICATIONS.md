# Notificações para Contatos de Emergência

Este documento descreve a funcionalidade de notificação de contatos de emergência quando um medicamento não é tomado no horário programado.

## Visão Geral

Quando um medicamento não é tomado após o terceiro lembrete, o sistema envia automaticamente um e-mail para os contatos de emergência cadastrados, informando sobre o medicamento não tomado.

## Fluxo de Funcionamento

1. **Agendamento de Notificações**:
   - O sistema agenda notificações para cada horário de medicamento.
   - Se o usuário não interagir com a notificação, lembretes adicionais são enviados em intervalos configuráveis.

2. **Marcação como Perdido**:
   - Após o terceiro lembrete, se o usuário ainda não tiver tomado o medicamento, ele é automaticamente marcado como "perdido".
   - Um registro é adicionado ao histórico do usuário.

3. **Notificação de Contatos de Emergência**:
   - O sistema identifica os contatos de emergência cadastrados.
   - Um e-mail é enviado para cada contato com as seguintes informações:
     - Nome do usuário que esqueceu o medicamento
     - Nome do medicamento não tomado
     - Horário programado para o medicamento
     - Mensagem solicitando verificação do usuário

## Configuração Necessária

### Variáveis de Ambiente

Certifique-se de configurar as seguintes variáveis de ambiente no arquivo `.env` na pasta `backend`:

```
# Configurações de E-mail
EMAIL_USER=seu_email@gmail.com
EMAIL_PASSWORD=sua_senha_do_email
EMAIL_FROM="Sistema de Lembretes de Medicamentos"

# Configurações de Notificação
NOTIFICATION_REMINDER_INTERVAL=15 # minutos entre lembretes
MAX_REMINDERS=3 # número máximo de lembretes
```

### Dependências

Certifique-se de que as seguintes dependências estejam instaladas:

```bash
cd backend
npm install nodemailer dotenv
```

## Testando a Funcionalidade

1. **Configuração de Contatos de Emergência**:
   - Acesse a tela de perfil do usuário.
   - Adicione pelo menos um contato de emergência com um endereço de e-mail válido.
   - Certifique-se de que o contato está marcado como "Primário".

2. **Teste de Medicamento Perdido**:
   - Adicione um medicamento de teste.
   - Defina um horário próximo para o teste.
   - Não interaja com as notificações.
   - Após o terceiro lembrete (configurado por padrão para 15 minutos após o horário programado), o sistema deve marcar o medicamento como "perdido" e enviar um e-mail para o contato de emergência.

## Solução de Problemas

### E-mails não estão sendo enviados

1. Verifique se as credenciais de e-mail estão corretas no arquivo `.env`.
2. Verifique se o serviço de e-mail está ativo e acessível.
3. Verifique os logs do servidor para mensagens de erro relacionadas ao envio de e-mail.

### Contatos de emergência não estão recebendo notificações

1. Verifique se o contato de emergência tem um endereço de e-mail válido.
2. Verifique se o e-mail não foi parar na pasta de spam.
3. Verifique se o usuário tem permissão para receber notificações.

## Personalização

Você pode personalizar o modelo de e-mail editando a função `sendMissedMedicationAlert` no arquivo `backend/services/emailService.js`.

## Segurança

- As credenciais de e-mail são armazenadas apenas como variáveis de ambiente no servidor.
- Os e-mails são enviados usando conexão segura (TLS/SSL).
- Os contatos de emergência só podem ser gerenciados pelo próprio usuário após a autenticação.
