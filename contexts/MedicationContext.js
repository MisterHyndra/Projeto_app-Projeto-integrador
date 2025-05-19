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
      
      // Adicionar ao histórico como agendado
      const historyEntry = {
        id: Date.now().toString(),
        type: 'add',
        status: 'scheduled',
        medicationId: newMedication.id,
        medicationName: newMedication.name,
        scheduledTime: medicationData.timeOfDay ? medicationData.timeOfDay.join(', ') : '',
        timestamp: currentDate.toISOString(),
        date: currentDate.toISOString().split('T')[0], // Armazenar apenas a data (YYYY-MM-DD)
      };
      
      const updatedHistory = [...history, historyEntry];
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
      setMedications(prevMedications => 
        prevMedications.map(med => 
          med.id === id ? { ...med, ...medicationData, updatedAt: new Date().toISOString() } : med
        )
      );
      return true;
    } catch (error) {
      console.error('Erro ao atualizar medicamento:', error);
      return false;
    }
  };

  // Remover um medicamento
  const deleteMedication = async (id) => {
    try {
      setMedications(prevMedications => 
        prevMedications.filter(med => med.id !== id)
      );
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
        scheduledTime,
        takenAt: currentDate.toISOString(),
        status: 'taken',
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
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const relevantHistory = history.filter(entry => {
        const entryDate = new Date(entry.takenAt || entry.missedAt);
        return entryDate >= start && entryDate <= end;
      });
      
      if (relevantHistory.length === 0) {
        return 0;
      }
      
      const takenCount = relevantHistory.filter(entry => entry.status === 'taken').length;
      return Math.round((takenCount / relevantHistory.length) * 100);
    } catch (error) {
      console.error('Erro ao calcular taxa de adesão:', error);
      return 0;
    }
  };

  // Obter o histórico para um período específico
  const getHistoryForPeriod = (startDate, endDate) => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      return history.filter(entry => {
        const entryDate = new Date(entry.takenAt || entry.missedAt);
        return entryDate >= start && entryDate <= end;
      }).sort((a, b) => {
        const dateA = new Date(a.takenAt || a.missedAt);
        const dateB = new Date(b.takenAt || b.missedAt);
        return dateB - dateA; // Ordenar do mais recente para o mais antigo
      });
    } catch (error) {
      console.error('Erro ao obter histórico para o período:', error);
      return [];
    }
  };

  // Obter medicamentos programados para hoje
  const getTodayMedications = () => {
    // Usar a data atual correta para evitar problemas com fuso horário
    const today = new Date();
    // Resetar a hora para comparar apenas as datas
    today.setHours(0, 0, 0, 0);
    
    // Obter o dia da semana atual (0-6, onde 0 é domingo)
    const dayOfWeekIndex = today.getDay();
    
    return medications.filter(med => {
      // Verificar se o medicamento está dentro do período de tratamento
      let startDate = null;
      if (med.startDate) {
        startDate = new Date(med.startDate);
        startDate.setHours(0, 0, 0, 0);
      }
      
      let endDate = null;
      if (med.endDate) {
        endDate = new Date(med.endDate);
        endDate.setHours(0, 0, 0, 0);
      }
      
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
        return med.daysOfWeek.includes(dayOfWeekIndex);
      }
      
      return false;
    });
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
        
        console.log('Notificações configuradas com sucesso');
      } catch (error) {
        console.error('Erro ao configurar notificações:', error);
      }
    };
    
    configureNotifications();
  }, [notificationSettings]);

  // Agendar notificação para um medicamento
  const scheduleNotification = async (medicationId, scheduledTime) => {
    try {
      const medication = medications.find(med => med.id === medicationId);
      if (!medication) return;
      
      // Converter string de data/hora para objeto Date
      let notificationDate;
      if (typeof scheduledTime === 'string') {
        // Se for uma string ISO, converter para Date
        if (scheduledTime.includes('T')) {
          notificationDate = new Date(scheduledTime);
        } else {
          // Se for apenas um horário (HH:MM), combinar com a data atual
          const [hours, minutes] = scheduledTime.split(':').map(Number);
          notificationDate = new Date();
          notificationDate.setHours(hours, minutes, 0, 0);
        }
      } else if (scheduledTime instanceof Date) {
        notificationDate = scheduledTime;
      } else {
        console.error('Formato de data/hora inválido:', scheduledTime);
        return;
      }
      
      // Verificar se a data não está no passado
      if (notificationDate < new Date()) {
        console.log('Data de notificação no passado, ajustando para amanhã');
        notificationDate.setDate(notificationDate.getDate() + 1);
      }
      
      console.log(`Agendando notificação para ${medication.name} em ${notificationDate.toLocaleString()}`);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Hora do Medicamento',
          body: `Está na hora de tomar ${medication.name} (${medication.dosage})`,
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
    } catch (error) {
      console.error('Erro ao agendar notificação:', error);
    }
  };
  
  // Agendar todas as notificações para um medicamento
  const scheduleNotificationsForMedication = async (medication) => {
    try {
      if (!medication || !medication.timeOfDay || medication.timeOfDay.length === 0) {
        return;
      }
      
      // Cancelar notificações existentes para este medicamento
      await cancelNotificationsForMedication(medication.id);
      
      // Para cada horário do medicamento, agendar uma notificação
      for (const timeStr of medication.timeOfDay) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        
        // Criar data para hoje com o horário especificado
        const notificationDate = new Date();
        notificationDate.setHours(hours, minutes, 0, 0);
        
        // Se o horário já passou hoje, agendar para amanhã
        if (notificationDate < new Date()) {
          notificationDate.setDate(notificationDate.getDate() + 1);
        }
        
        // Agendar notificação principal
        const notificationId = await scheduleNotification(medication.id, notificationDate);
        console.log(`Notificação agendada para ${medication.name} às ${timeStr} com ID: ${notificationId}`);
        
        // Agendar lembretes adicionais se configurado
        if (notificationSettings.maxReminders > 0) {
          for (let i = 1; i <= notificationSettings.maxReminders; i++) {
            const reminderDate = addMinutes(notificationDate, i * notificationSettings.reminderInterval);
            const reminderId = await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Lembrete de Medicamento',
                body: `Lembrete: Você ainda não tomou ${medication.name}`,
                sound: notificationSettings.soundEnabled,
                vibrate: notificationSettings.vibrationEnabled ? [0, 250, 250, 250] : null,
                data: { medicationId: medication.id, isReminder: true, reminderNumber: i },
              },
              trigger: {
                date: reminderDate,
                channelId: 'medication-reminders',
              },
            });
            console.log(`Lembrete ${i} agendado para ${reminderDate.toLocaleString()} com ID: ${reminderId}`);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao agendar notificações para medicamento:', error);
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
    } catch (error) {
      console.error('Erro ao cancelar notificações:', error);
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
