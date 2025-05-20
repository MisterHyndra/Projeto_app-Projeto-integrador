  // Agendar todas as notificações para um medicamento
  const scheduleNotificationsForMedication = async (medication) => {
    try {
      if (!medication || !medication.timeOfDay || medication.timeOfDay.length === 0) {
        console.log('Nenhum horário definido para o medicamento');
        return false;
      }
      
      console.log(`Agendando notificações para o medicamento: ${medication.name}`);
      
      // Cancelar notificações existentes para este medicamento
      await cancelNotificationsForMedication(medication.id);
      
      // Limpar quaisquer notificações pendentes para este medicamento
      const scheduledNotifs = await Notifications.getAllScheduledNotificationsAsync();
      const medicationNotifs = scheduledNotifs.filter(notif => 
        notif.content.data?.medicationId === medication.id
      );
      
      for (const notif of medicationNotifs) {
        console.log(`Cancelando notificação existente: ${notif.identifier}`);
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
      
      // Para cada horário do medicamento, agendar uma notificação
      for (const timeStr of medication.timeOfDay) {
        try {
          console.log(`Processando horário: ${timeStr}`);
          const [hours, minutes] = timeStr.split(':').map(Number);
          
          // Criar data para hoje com o horário especificado
          const notificationDate = new Date();
          notificationDate.setHours(hours, minutes, 0, 0);
          
          // Se o horário já passou hoje, agendar para amanhã
          if (notificationDate < new Date()) {
            console.log(`Horário já passou hoje, agendando para amanhã: ${notificationDate.toLocaleString()}`);
            notificationDate.setDate(notificationDate.getDate() + 1);
          }
          
          // Calcular o tempo em milissegundos até a notificação
          const timeUntilNotification = notificationDate.getTime() - new Date().getTime();
          console.log(`Tempo até a notificação: ${timeUntilNotification / (1000 * 60)} minutos`);
          
          // Verificar se a notificação deve ser agendada para o futuro (pelo menos 1 minuto)
          if (timeUntilNotification < 60 * 1000) { // Menos de 1 minuto
            console.log(`Notificação muito próxima, agendando para amanhã em vez de agora`);
            notificationDate.setDate(notificationDate.getDate() + 1);
          }
          
          // Agendar a notificação principal
          const notificationId = await scheduleNotification(medication.id, notificationDate);
          
          if (notificationId) {
            console.log(`Notificação agendada com sucesso para ${notificationDate.toLocaleString()}`);
            
            // Adicionar à lista de próximas notificações
            const upcomingNotification = {
              id: notificationId,
              title: 'Hora do Medicamento',
              body: `Está na hora de tomar ${medication.name}`,
              time: format(notificationDate, 'HH:mm', { locale: ptBR }),
              date: format(notificationDate, 'dd/MM/yyyy', { locale: ptBR }),
              triggerTimestamp: notificationDate.getTime(),
              medicationId: medication.id,
              medicationName: medication.name,
              scheduledTime: notificationDate.toISOString(),
              isTest: false
            };
            
            await saveUpcomingNotification(upcomingNotification);
            
            // Agendar lembretes adicionais se configurado
            if (notificationSettings.reminderInterval > 0 && notificationSettings.maxReminders > 0) {
              for (let i = 1; i <= notificationSettings.maxReminders; i++) {
                const reminderDate = new Date(notificationDate);
                reminderDate.setMinutes(reminderDate.getMinutes() + (notificationSettings.reminderInterval * i));
                
                // Verificar se a data do lembrete ainda é no futuro
                if (reminderDate > new Date()) {
                  const reminderId = await scheduleNotification(medication.id, reminderDate);
                  
                  if (reminderId) {
                    console.log(`Lembrete ${i} agendado para ${reminderDate.toLocaleString()}`);
                  } else {
                    console.error(`Falha ao agendar lembrete ${i} para:`, medication.name);
                  }
                }
              }
            }
          } else {
            console.error('Falha ao agendar notificação para:', medication.name);
          }
        } catch (error) {
          console.error(`Erro ao agendar notificação para ${medication.name} às ${timeStr}:`, error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao agendar notificações para o medicamento:', error);
      return false;
    }
  };
