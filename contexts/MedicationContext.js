import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, parseISO, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from './AuthContext';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const MedicationContext = createContext();

export const useMedication = () => useContext(MedicationContext);

export const MedicationProvider = ({ children }) => {
  const [medications, setMedications] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notificationSettings, setNotificationSettings] = useState({
    soundEnabled: true,
    vibrationEnabled: true,
    reminderInterval: 5, // minutes
    maxReminders: 3
  });
  const { isAuthenticated, user } = useAuth();

  // Carregar medicamentos do AsyncStorage quando o componente for montado
  useEffect(() => {
    const loadMedications = async () => {
      try {
        if (isAuthenticated && user?.id) {
          setLoading(true);
          const storedMedications = await AsyncStorage.getItem(`medications_${user.id}`);
          const storedHistory = await AsyncStorage.getItem(`history_${user.id}`);
          
          if (storedMedications) {
            setMedications(JSON.parse(storedMedications));
          }
          
          if (storedHistory) {
            setHistory(JSON.parse(storedHistory));
          }
        }
      } catch (error) {
        console.error('Erro ao carregar medicamentos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMedications();
  }, [isAuthenticated, user]);

  // Salvar medicamentos no AsyncStorage sempre que forem atualizados
  useEffect(() => {
    const saveMedications = async () => {
      try {
        if (isAuthenticated && user?.id && !loading) {
          await AsyncStorage.setItem(`medications_${user.id}`, JSON.stringify(medications));
        }
      } catch (error) {
        console.error('Erro ao salvar medicamentos:', error);
      }
    };

    saveMedications();
  }, [medications, isAuthenticated, user, loading]);

  // Salvar histórico no AsyncStorage sempre que for atualizado
  useEffect(() => {
    const saveHistory = async () => {
      try {
        if (isAuthenticated && user?.id && !loading) {
          await AsyncStorage.setItem(`history_${user.id}`, JSON.stringify(history));
        }
      } catch (error) {
        console.error('Erro ao salvar histórico:', error);
      }
    };

    saveHistory();
  }, [history, isAuthenticated, user, loading]);

  // Adicionar um novo medicamento
  const addMedication = async (medicationData) => {
    try {
      // Garantir que estamos usando a data atual correta
      const currentDate = new Date();
      
      const newMedication = {
        id: Date.now().toString(),
        ...medicationData,
        createdAt: currentDate.toISOString(),
      };
      
      // Adicionar o novo medicamento à lista
      const updatedMedications = [...medications, newMedication];
      setMedications(updatedMedications);
      
      // Salvar imediatamente no AsyncStorage para garantir persistência
      if (isAuthenticated && user?.id) {
        await AsyncStorage.setItem(`medications_${user.id}`, JSON.stringify(updatedMedications));
      }
      
      // Para cada horário do medicamento, criar uma entrada no histórico como agendado
      const updatedHistory = [...history];
      
      if (medicationData.timeOfDay && medicationData.timeOfDay.length > 0) {
        medicationData.timeOfDay.forEach(timeStr => {
          // Criar data para o horário agendado
          const [hours, minutes] = timeStr.split(':').map(Number);
          const scheduledDate = new Date(currentDate);
          scheduledDate.setHours(hours, minutes, 0, 0);
          
          // Se o horário já passou hoje, agendar para amanhã
          if (scheduledDate < currentDate) {
            scheduledDate.setDate(scheduledDate.getDate() + 1);
          }
          
          const historyEntry = {
            id: `${Date.now().toString()}_${timeStr}`,
            type: 'scheduled',
            status: 'scheduled', // Status inicial: agendado
            medicationId: newMedication.id,
            medicationName: newMedication.name,
            scheduledTime: scheduledDate.toISOString(),
            timestamp: scheduledDate.toISOString(),
            date: scheduledDate.toISOString().split('T')[0], // Armazenar apenas a data (YYYY-MM-DD)
          };
          
          updatedHistory.push(historyEntry);
        });
      } else {
        // Se não houver horários específicos, criar uma entrada genérica
        const historyEntry = {
          id: Date.now().toString(),
          type: 'add',
          status: 'scheduled',
          medicationId: newMedication.id,
          medicationName: newMedication.name,
          scheduledTime: '',
          timestamp: currentDate.toISOString(),
          date: currentDate.toISOString().split('T')[0], // Armazenar apenas a data (YYYY-MM-DD)
        };
        
        updatedHistory.push(historyEntry);
      }
      
      setHistory(updatedHistory);
      
      // Salvar histórico no AsyncStorage
      if (isAuthenticated && user?.id) {
        await AsyncStorage.setItem(`history_${user.id}`, JSON.stringify(updatedHistory));
      }
      
      // Agendar notificações para este medicamento
      scheduleNotificationsForMedication(newMedication);
      
      return true;
    } catch (error) {
      console.error('Erro ao adicionar medicamento:', error);
      return false;
    }
  };

  // Atualizar um medicamento existente
  const updateMedication = async (id, medicationData) => {
    try {
      const updatedMedications = medications.map(med => 
        med.id === id ? { ...med, ...medicationData } : med
      );
      
      setMedications(updatedMedications);
      
      // Atualizar notificações
      const updatedMedication = updatedMedications.find(med => med.id === id);
      if (updatedMedication) {
        scheduleNotificationsForMedication(updatedMedication);
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao atualizar medicamento:', error);
      return false;
    }
  };

  // Remover um medicamento
  const deleteMedication = async (id) => {
    try {
      const updatedMedications = medications.filter(med => med.id !== id);
      setMedications(updatedMedications);
      
      // Cancelar notificações
      await cancelNotificationsForMedication(id);
      
      return true;
    } catch (error) {
      console.error('Erro ao remover medicamento:', error);
      return false;
    }
  };

  // Registrar uma dose tomada
  const logMedicationTaken = async (medicationId, scheduledTime) => {
    try {
      const medication = medications.find(med => med.id === medicationId);
      
      if (!medication) {
        throw new Error('Medicamento não encontrado');
      }
      
      const currentDate = new Date();
      const logEntry = {
        id: Date.now().toString(),
        medicationId,
        medicationName: medication.name,
        // Garantir que scheduledTime seja uma string válida ou usar a data atual
        timestamp: scheduledTime || currentDate.toISOString(),
        scheduledTime: scheduledTime || currentDate.toISOString(),
        takenAt: currentDate.toISOString(),
        status: 'taken', // Sempre usar 'taken' em inglês para padronizar
        date: currentDate.toISOString().split('T')[0], // Armazenar apenas a data (YYYY-MM-DD)
      };
      
      console.log('Registrando medicamento como tomado:', logEntry);
      
      const updatedHistory = [...history, logEntry];
      setHistory(updatedHistory);
      
      // Salvar histórico no AsyncStorage
      if (isAuthenticated && user?.id) {
        await AsyncStorage.setItem(`history_${user.id}`, JSON.stringify(updatedHistory));
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao registrar medicamento tomado:', error);
      return false;
    }
  };

  // Registrar uma dose perdida
  const logMedicationMissed = async (medicationId, scheduledTime) => {
    try {
      const medication = medications.find(med => med.id === medicationId);
      
      if (!medication) {
        throw new Error('Medicamento não encontrado');
      }
      
      const currentDate = new Date();
      const logEntry = {
        id: Date.now().toString(),
        medicationId,
        medicationName: medication.name,
        scheduledTime,
        missedAt: currentDate.toISOString(),
        status: 'missed',
        date: currentDate.toISOString().split('T')[0], // Armazenar apenas a data (YYYY-MM-DD)
      };
      
      const updatedHistory = [...history, logEntry];
      setHistory(updatedHistory);
      
      // Salvar histórico no AsyncStorage
      if (isAuthenticated && user?.id) {
        await AsyncStorage.setItem(`history_${user.id}`, JSON.stringify(updatedHistory));
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao registrar medicamento perdido:', error);
      return false;
    }
  };

  // Calcular a taxa de adesão para um período específico
  const calculateAdherenceRate = (startDate, endDate) => {
    try {
      // Filtrar histórico pelo período
      const periodHistory = history.filter(item => {
        const itemDate = new Date(item.date || item.timestamp || item.takenAt || item.missedAt);
        return itemDate >= startDate && itemDate <= endDate;
      });
      
      if (periodHistory.length === 0) {
        return 0;
      }
      
      // Contar medicamentos tomados
      const takenCount = periodHistory.filter(item => 
        item.status === 'taken' || item.status === 'tomado'
      ).length;
      
      // Contar total de medicamentos (tomados + perdidos)
      const totalCount = periodHistory.filter(item => 
        item.status === 'taken' || item.status === 'tomado' || 
        item.status === 'missed' || item.status === 'perdido'
      ).length;
      
      if (totalCount === 0) {
        return 0;
      }
      
      return Math.round((takenCount / totalCount) * 100);
    } catch (error) {
      console.error('Erro ao calcular taxa de adesão:', error);
      return 0;
    }
  };

  // Obter o histórico para um período específico
  const getHistoryForPeriod = (startDate, endDate) => {
    try {
      // Filtrar histórico pelo período
      return history.filter(item => {
        try {
          const itemDateStr = item.date || item.timestamp || item.takenAt || item.missedAt;
          if (!itemDateStr) return false;
          
          const itemDate = new Date(itemDateStr);
          return itemDate >= startDate && itemDate <= endDate;
        } catch (error) {
          console.error('Erro ao processar data do item:', error);
          return false;
        }
      }).sort((a, b) => {
        // Ordenar por data (mais recente primeiro)
        const getDate = (entry) => {
          const dateStr = entry.date || entry.timestamp || entry.takenAt || entry.missedAt;
          return dateStr ? new Date(dateStr) : new Date(0);
        };
        
        return getDate(b) - getDate(a);
      });
    } catch (error) {
      console.error('Erro ao obter histórico para período:', error);
      return [];
    }
  };

  // Obter medicamentos programados para hoje
  const getTodayMedications = () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Filtrar medicamentos ativos
      return medications.filter(med => {
        // Verificar período de tratamento
        const startDate = med.startDate ? new Date(med.startDate) : null;
        const endDate = med.endDate ? new Date(med.endDate) : null;
        
        const isWithinTreatmentPeriod = 
          (!startDate || today >= startDate) && 
          (!endDate || today <= endDate);
        
        if (!isWithinTreatmentPeriod) {
          return false;
        }
        
        // Verificar frequência
        if (med.frequency === 'daily') {
          return true;
        } else if (med.frequency === 'weekly' && med.daysOfWeek && med.daysOfWeek.length > 0) {
          // Verificar se o dia atual está na lista de dias selecionados
          const dayOfWeek = today.getDay(); // 0 = domingo, 1 = segunda, etc.
          return med.daysOfWeek.includes(dayOfWeek);
        }
        
        return false;
      });
    } catch (error) {
      console.error('Erro ao obter medicamentos para hoje:', error);
      return [];
    }
  };

  // Limpar o histórico
  const clearHistory = async () => {
    try {
      setHistory([]);
      
      // Salvar histórico vazio no AsyncStorage
      if (isAuthenticated && user?.id) {
        await AsyncStorage.setItem(`history_${user.id}`, JSON.stringify([]));
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao limpar histórico:', error);
      return false;
    }
  };

  // Atualizar configurações de notificação
  const updateNotificationSettings = async (settings) => {
    try {
      const updatedSettings = { ...notificationSettings, ...settings };
      setNotificationSettings(updatedSettings);
      
      if (isAuthenticated && user?.id) {
        await AsyncStorage.setItem(
          `notificationSettings_${user.id}`,
          JSON.stringify(updatedSettings)
        );
      }
      return true;
    } catch (error) {
      console.error('Erro ao atualizar configurações de notificação:', error);
      return false;
    }
  };

  // Configurar notificações
  useEffect(() => {
    const configureNotifications = async () => {
      try {
        // Solicitar permissões de notificação
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.log('Permissão de notificação não concedida!');
          return;
        }
        
        // Configurar como as notificações são exibidas quando o app está em primeiro plano
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: notificationSettings.soundEnabled,
            shouldSetBadge: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          }),
        });
        
        // Configurar receptor para processar notificações
        const subscription = Notifications.addNotificationReceivedListener(notification => {
          try {
            const data = notification.request.content.data;
            
            // Se for o último lembrete, marcar como perdido após um tempo
            if (data && data.isReminder && data.reminderNumber === notificationSettings.maxReminders) {
              const medicationId = data.medicationId;
              
              // Verificar se o medicamento existe e não foi tomado
              if (medicationId) {
                // Buscar no histórico se o medicamento já foi tomado
                const medicationHistory = history.filter(item => 
                  item.medicationId === medicationId && 
                  item.scheduledTime === data.scheduledTime
                );
                
                const wasTaken = medicationHistory.some(item => 
                  item.status === 'taken' || item.status === 'tomado'
                );
                
                // Se não foi tomado, marcar como perdido após 5 minutos
                if (!wasTaken) {
                  setTimeout(() => {
                    logMedicationMissed(medicationId, data.scheduledTime);
                    console.log(`Medicamento ${medicationId} marcado como perdido automaticamente após último lembrete`);
                  }, 5 * 60 * 1000); // 5 minutos
                }
              }
            }
          } catch (error) {
            console.error('Erro ao processar notificação:', error);
          }
        });
        
        console.log('Notificações configuradas com sucesso');
        
        return () => {
          if (subscription) {
            subscription.remove();
          }
        };
      } catch (error) {
        console.error('Erro ao configurar notificações:', error);
      }
    };
    
    configureNotifications();
  }, [notificationSettings, history]);

  // Agendar notificação para um medicamento
  const scheduleNotification = async (medicationId, scheduledTime) => {
    try {
      const medication = medications.find(med => med.id === medicationId);
      if (!medication) return null;
      
      // Converter string de data/hora para objeto Date
      let notificationDate;
      if (typeof scheduledTime === 'string') {
        try {
          // Verificar se é uma string ISO
          if (scheduledTime.includes('T')) {
            notificationDate = new Date(scheduledTime);
          } else {
            // Se for apenas um horário (HH:MM), combinar com a data atual
            const [hours, minutes] = scheduledTime.split(':').map(Number);
            notificationDate = new Date();
            notificationDate.setHours(hours, minutes, 0, 0);
          }
        } catch (error) {
          console.error('Erro ao converter data/hora:', error);
          return null;
        }
      } else if (scheduledTime instanceof Date) {
        notificationDate = scheduledTime;
      } else {
        console.error('Formato de data/hora inválido:', scheduledTime);
        return null;
      }
      
      // Verificar se a data não está no passado
      if (notificationDate < new Date()) {
        console.log('Data de notificação no passado, ajustando para amanhã');
        notificationDate.setDate(notificationDate.getDate() + 1);
      }
      
      console.log(`Agendando notificação para ${medication.name} em ${notificationDate.toLocaleString()}`);

      try {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Hora do Medicamento',
            body: `Está na hora de tomar ${medication.name} (${medication.dosage || ''})`,
            sound: notificationSettings.soundEnabled,
            vibrate: notificationSettings.vibrationEnabled ? [0, 250, 250, 250] : null,
            data: { medicationId, scheduledTime: notificationDate.toISOString() },
          },
          trigger: {
            date: notificationDate,
            channelId: 'medication-reminders',
          },
        });
        
        console.log(`Notificação agendada com ID: ${notificationId}`);
        return notificationId;
      } catch (innerError) {
        console.error('Erro ao agendar notificação:', innerError);
        return null;
      }
    } catch (error) {
      console.error('Erro ao preparar notificação:', error);
      return null;
    }
  };
  
  // Agendar todas as notificações para um medicamento
  const scheduleNotificationsForMedication = async (medication) => {
    try {
      if (!medication || !medication.timeOfDay || medication.timeOfDay.length === 0) {
        return false;
      }
      
      // Cancelar notificações existentes para este medicamento
      await cancelNotificationsForMedication(medication.id);
      
      // Para cada horário do medicamento, agendar uma notificação
      for (const timeStr of medication.timeOfDay) {
        try {
          const [hours, minutes] = timeStr.split(':').map(Number);
          
          // Criar data para hoje com o horário especificado
          const notificationDate = new Date();
          notificationDate.setHours(hours, minutes, 0, 0);
          
          // Se o horário já passou hoje, agendar para amanhã
          if (notificationDate < new Date()) {
            notificationDate.setDate(notificationDate.getDate() + 1);
          }
          
          // Agendar notificação principal
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Hora do Medicamento',
              body: `Está na hora de tomar ${medication.name}`,
              sound: notificationSettings.soundEnabled,
              vibrate: notificationSettings.vibrationEnabled ? [0, 250, 250, 250] : null,
              data: { medicationId: medication.id, scheduledTime: notificationDate.toISOString() },
            },
            trigger: {
              date: notificationDate,
              channelId: 'medication-reminders',
            },
          });
          
          console.log(`Notificação agendada para ${medication.name} às ${timeStr} com ID: ${notificationId}`);
          
          // Agendar lembretes adicionais se configurado
          if (notificationSettings.maxReminders > 0) {
            for (let i = 1; i <= notificationSettings.maxReminders; i++) {
              const reminderDate = addMinutes(notificationDate, i * notificationSettings.reminderInterval);
              
              // Determinar o texto do lembrete
              let reminderText = `Lembrete: Você ainda não tomou ${medication.name}`;
              if (i === notificationSettings.maxReminders) {
                reminderText = `Último lembrete: ${medication.name} será marcado como perdido se não for tomado`;
              }
              
              const reminderId = await Notifications.scheduleNotificationAsync({
                content: {
                  title: `Lembrete de Medicamento ${i}/${notificationSettings.maxReminders}`,
                  body: reminderText,
                  sound: notificationSettings.soundEnabled,
                  vibrate: notificationSettings.vibrationEnabled ? [0, 250, 250, 250] : null,
                  data: { 
                    medicationId: medication.id, 
                    isReminder: true, 
                    reminderNumber: i,
                    scheduledTime: notificationDate.toISOString(),
                    medicationName: medication.name
                  },
                },
                trigger: {
                  date: reminderDate,
                  channelId: 'medication-reminders',
                },
              });
              
              console.log(`Lembrete ${i} agendado para ${reminderDate.toLocaleString()} com ID: ${reminderId}`);
            }
          }
        } catch (innerError) {
          console.error(`Erro ao agendar notificação para horário ${timeStr}:`, innerError);
        }
      }
      return true;
    } catch (error) {
      console.error('Erro ao agendar notificações para medicamento:', error);
      return false;
    }
  };
  
  // Cancelar todas as notificações para um medicamento
  const cancelNotificationsForMedication = async (medicationId) => {
    try {
      // Obter todas as notificações agendadas
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      // Filtrar notificações para este medicamento
      const medicationNotifications = scheduledNotifications.filter(
        notification => notification.content.data?.medicationId === medicationId
      );
      
      // Cancelar cada notificação
      for (const notification of medicationNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log(`Notificação cancelada: ${notification.identifier}`);
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao cancelar notificações:', error);
      return false;
    }
  };

  return (
    <MedicationContext.Provider
      value={{
        medications,
        history,
        loading,
        addMedication,
        updateMedication,
        deleteMedication,
        logMedicationTaken,
        logMedicationMissed,
        calculateAdherenceRate,
        getHistoryForPeriod,
        getTodayMedications,
        clearHistory,
        notificationSettings,
        updateNotificationSettings,
        scheduleNotification,
      }}
    >
      {children}
    </MedicationContext.Provider>
  );
};
