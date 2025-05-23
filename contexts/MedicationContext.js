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

  /**
   * Registra uma dose de medicamento como tomada
   * @param {string} medicationId - ID do medicamento
   * @param {string|Date} scheduledTime - Data/hora programada (opcional)
   * @returns {Promise<boolean>} - Retorna true se o registro for bem-sucedido
   */
  const logMedicationTaken = async (medicationId, scheduledTime) => {
    // 1. Validação inicial dos parâmetros
    if (!medicationId) {
      console.error('❌ Erro: ID do medicamento não fornecido');
      return false;
    }

    console.log(`\n📝 Iniciando registro de medicamento tomado`);
    console.log(`💊 ID do medicamento: ${medicationId}`);
    console.log(`⏰ Horário programado: ${scheduledTime || 'Não especificado'}`);

    try {
      // 2. Validar e processar o horário
      const currentDate = new Date();
      let timestamp = currentDate.toISOString();
      let scheduledTimestamp = null;

      // Processar scheduledTime se fornecido
      if (scheduledTime) {
        try {
          scheduledTimestamp = typeof scheduledTime === 'string' 
            ? new Date(scheduledTime) 
            : new Date(scheduledTime);
          
          // Verificar se a data é válida
          if (isNaN(scheduledTimestamp.getTime())) {
            console.warn('⚠️  Data/hora programada inválida, usando data/hora atual');
            scheduledTimestamp = currentDate;
          }
        } catch (error) {
          console.warn('⚠️  Erro ao processar data/hora programada, usando data/hora atual:', error);
          scheduledTimestamp = currentDate;
        }
      }

      // 3. Encontrar o medicamento
      const medication = medications.find(med => med.id === medicationId);
      
      if (!medication) {
        console.error(`❌ Medicamento não encontrado com o ID: ${medicationId}`);
        
        // Mesmo sem encontrar o medicamento, podemos registrar no histórico
        // para manter um registro completo
        const errorLog = {
          id: `error_${Date.now()}`,
          type: 'error',
          status: 'error',
          message: 'Medicamento não encontrado',
          error: `ID não encontrado: ${medicationId}`,
          timestamp: timestamp,
          scheduledTime: scheduledTimestamp ? scheduledTimestamp.toISOString() : null,
          date: timestamp.split('T')[0]
        };
        
        const updatedHistory = [...history, errorLog];
        setHistory(updatedHistory);
        
        if (isAuthenticated && user?.id) {
          await AsyncStorage.setItem(`history_${user.id}`, JSON.stringify(updatedHistory));
        }
        
        return false;
      }

      // 4. Criar entrada de histórico
      const logEntry = {
        id: `taken_${Date.now()}_${medicationId}`,
        medicationId,
        medicationName: medication.name,
        dosage: medication.dosage,
        timestamp: timestamp,
        scheduledTime: scheduledTimestamp ? scheduledTimestamp.toISOString() : timestamp,
        type: 'taken',
        status: 'taken',
        date: timestamp.split('T')[0], // Formato YYYY-MM-DD
        metadata: {
          source: 'user',
          deviceTime: new Date().toISOString(),
          timezoneOffset: currentDate.getTimezoneOffset(),
          appVersion: '1.0.0' // TODO: Obter da configuração do app
        }
      };

      console.log('📋 Dados do registro:', JSON.stringify({
        ...logEntry,
        scheduledTime: logEntry.scheduledTime || 'N/A'
      }, null, 2));
      
      // 5. Atualizar o estado local
      const updatedHistory = [...history, logEntry];
      setHistory(updatedHistory);
      
      // 6. Persistir no AsyncStorage
      if (isAuthenticated && user?.id) {
        try {
          await AsyncStorage.setItem(`history_${user.id}`, JSON.stringify(updatedHistory));
          console.log('💾 Histórico salvo com sucesso no AsyncStorage');
        } catch (storageError) {
          console.error('❌ Erro ao salvar no AsyncStorage:', storageError);
          // Não retornamos false aqui para não falhar a operação principal
        }
      }
      
      // 7. Verificar se há notificações pendentes para este horário e cancelá-las
      if (scheduledTimestamp) {
        try {
          const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
          const notificationsToCancel = scheduledNotifications.filter(notification => {
            const notificationData = notification.content.data;
            return (
              notificationData.medicationId === medicationId &&
              notificationData.scheduledTime === scheduledTimestamp.toISOString()
            );
          });
          
          if (notificationsToCancel.length > 0) {
            console.log(`🔔 Cancelando ${notificationsToCancel.length} notificação(ões) pendentes`);
            await Promise.all(
              notificationsToCancel.map(n => 
                Notifications.dismissNotificationAsync(n.identifier)
              )
            );
          }
        } catch (notificationError) {
          console.error('⚠️  Erro ao cancelar notificações pendentes:', notificationError);
          // Continuar mesmo com erro
        }
      }
      
      console.log('✅ Medicamento registrado como tomado com sucesso!');
      return true;
      
    } catch (error) {
      console.error('❌ ERRO CRÍTICO ao registrar medicamento tomado:', error);
      
      // Tentar registrar o erro no histórico mesmo em caso de falha
      try {
        const errorLog = {
          id: `error_${Date.now()}`,
          type: 'error',
          status: 'error',
          message: 'Falha ao registrar medicamento tomado',
          error: error.message,
          timestamp: new Date().toISOString(),
          medicationId: medicationId || 'unknown',
          date: new Date().toISOString().split('T')[0]
        };
        
        const errorHistory = [...history, errorLog];
        setHistory(errorHistory);
        
        if (isAuthenticated && user?.id) {
          await AsyncStorage.setItem(`history_${user.id}`, JSON.stringify(errorHistory));
        }
      } catch (innerError) {
        console.error('Falha ao registrar erro no histórico:', innerError);
      }
      
      return false;
    }
  };

  // Registrar uma dose perdida
  const logMedicationMissed = async (medicationId, scheduledTime) => {
    try {
      console.log(`Registrando medicamento perdido - ID: ${medicationId}, Horário: ${scheduledTime}`);
      
      // Verificar se o medicamento existe na lista de medicamentos
      const medication = medications.find(med => med.id === medicationId);
      const currentDate = new Date();
      let logEntry;
      let updatedHistory;
      
      if (!medication) {
        console.error('Medicamento não encontrado na lista de medicamentos:', medicationId);
        // Mesmo que não encontre, vamos criar um registro com as informações disponíveis
        console.log('Criando registro de histórico com informações parciais');
        
        logEntry = {
          id: Date.now().toString(),
          medicationId,
          medicationName: `Medicamento (ID: ${medicationId})`,
          scheduledTime: scheduledTime || currentDate.toISOString(),
          missedAt: currentDate.toISOString(),
          status: 'missed',
          date: currentDate.toISOString().split('T')[0],
          notes: 'Medicamento não encontrado na lista ao registrar como perdido'
        };
        
        updatedHistory = [...history, logEntry];
        setHistory(updatedHistory);
        
        if (isAuthenticated && user?.id) {
          try {
            await AsyncStorage.setItem(`history_${user.id}`, JSON.stringify(updatedHistory));
            
            // Tenta notificar contatos de emergência mesmo sem todas as informações
            try {
              await api.post('/notifications/medication-missed', {
                medicationName: `Medicamento (ID: ${medicationId})`,
                scheduledTime: scheduledTime || currentDate.toISOString()
              });
            } catch (error) {
              console.error('Erro ao notificar contatos de emergência:', error);
            }
          } catch (storageError) {
            console.error('Erro ao salvar histórico no AsyncStorage:', storageError);
          }
        }
        
        return true;
      }
      
      // Se encontrou o medicamento, cria um registro mais completo
      logEntry = {
        id: `${medicationId}_${currentDate.getTime()}`,
        medicationId,
        medicationName: medication.name,
        scheduledTime: scheduledTime || currentDate.toISOString(),
        missedAt: currentDate.toISOString(),
        status: 'missed',
        date: currentDate.toISOString().split('T')[0],
        dosage: medication.dosage,
        timeOfDay: medication.timeOfDay
      };
      
      console.log('Criando entrada de histórico para medicamento perdido:', logEntry);
      
      updatedHistory = [...history, logEntry];
      setHistory(updatedHistory);
      
      // Salvar histórico no AsyncStorage e notificar contatos de emergência
      if (isAuthenticated && user?.id) {
        try {
          await AsyncStorage.setItem(`history_${user.id}`, JSON.stringify(updatedHistory));
          console.log('Histórico de medicamento perdido salvo com sucesso');
          
          // Notificar contatos de emergência
          try {
            console.log('Notificando contatos de emergência...');
            const response = await api.post('/notifications/medication-missed', {
              medicationName: medication.name,
              scheduledTime: scheduledTime || currentDate.toISOString()
            });
            
            if (response.data.success) {
              console.log('Contatos de emergência notificados com sucesso');
            } else {
              console.warn('Aviso: Não foi possível notificar todos os contatos de emergência', 
                response.data.details);
            }
          } catch (error) {
            console.error('Erro ao notificar contatos de emergência:', error);
          }
        } catch (storageError) {
          console.error('Erro ao salvar histórico no AsyncStorage:', storageError);
          // Não vamos falhar completamente se apenas o salvamento no AsyncStorage falhar
        }
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao registrar medicamento perdido:', error);
      // Tentar registrar um log de erro no histórico
      try {
        const errorLog = {
          id: `error_${Date.now()}`,
          type: 'error',
          message: 'Falha ao registrar medicamento perdido',
          error: error.message,
          medicationId,
          timestamp: new Date().toISOString(),
          scheduledTime: scheduledTime || new Date().toISOString()
        };
        
        const errorHistory = [...history, errorLog];
        setHistory(errorHistory);
        
        if (isAuthenticated && user?.id) {
          await AsyncStorage.setItem(`history_${user.id}`, JSON.stringify(errorHistory));
        }
      } catch (innerError) {
        console.error('Falha ao registrar erro no histórico:', innerError);
      }
      
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

  // Verificar notificações agendadas
  const checkScheduledNotifications = async () => {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('Notificações agendadas:', scheduledNotifications.length);
      return scheduledNotifications;
    } catch (error) {
      console.error('Erro ao verificar notificações agendadas:', error);
      return [];
    }
  };

  // Objeto para armazenar os timeouts de notificação
  const [notificationTimeouts, setNotificationTimeouts] = useState({});

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
            console.log('📱 Notificação recebida:', {
              title: notification.request.content.title,
              data: data,
              timestamp: new Date().toISOString()
            });
            
            // Se for o último lembrete, marcar como perdido após um tempo
            if (data && data.isReminder && data.reminderNumber === notificationSettings.maxReminders) {
              const medicationId = data.medicationId;
              const scheduledTime = data.scheduledTime;
              
              console.log(`🔔 Último lembrete recebido para medicamento ${medicationId} às ${scheduledTime}`);
              
              // Verificar se o medicamento existe e não foi tomado
              if (medicationId) {
                // Buscar no histórico se o medicamento já foi tomado
                const medicationHistory = history.filter(item => 
                  item.medicationId === medicationId && 
                  item.scheduledTime === scheduledTime
                );
                
                const wasTaken = medicationHistory.some(item => 
                  item.status === 'taken' || item.status === 'tomado'
                );
                
                if (wasTaken) {
                  console.log(`✅ Medicamento ${medicationId} já foi tomado, pulando marcação como perdido`);
                  return;
                }
                
                // Verificar se já existe um registro de "perdido" para este horário
                const wasAlreadyMarkedAsMissed = medicationHistory.some(item => 
                  item.status === 'missed' || item.status === 'perdido'
                );
                
                if (wasAlreadyMarkedAsMissed) {
                  console.log('ℹ️  Medicamento já foi marcado como perdido anteriormente');
                  return;
                }
                
                // Se não foi tomado, marcar como perdido após 5 minutos
                console.log(`⏳ Agendando marcação automática como perdido para 5 minutos no futuro`);
                
                const timeoutId = setTimeout(async () => {
                  try {
                    console.log(`⌛️ Verificando novamente se o medicamento ${medicationId} foi tomado...`);
                    
                    // Verificar novamente se o medicamento foi tomado durante a espera
                    const updatedHistory = [...history];
                    const wasTakenInMeantime = updatedHistory.some(item => 
                      item.medicationId === medicationId && 
                      item.scheduledTime === scheduledTime &&
                      (item.status === 'taken' || item.status === 'tomado')
                    );
                    
                    if (wasTakenInMeantime) {
                      console.log(`✅ Medicamento ${medicationId} foi tomado durante a espera, cancelando marcação como perdido`);
                      return;
                    }
                    
                    // Marcar como perdido
                    console.log(`⚠️  Marcando medicamento ${medicationId} como perdido (horário: ${scheduledTime})`);
                    await logMedicationMissed(medicationId, scheduledTime);
                    
                    // Atualizar a lista de medicamentos para refletir a mudança
                    setMedications(prevMedications => 
                      prevMedications.map(med => 
                        med.id === medicationId 
                          ? { ...med, lastStatus: 'missed', lastUpdated: new Date().toISOString() }
                          : med
                      )
                    );
                    
                    console.log(`✅ Medicamento ${medicationId} marcado como perdido com sucesso`);
                  } catch (error) {
                    console.error('❌ Erro ao marcar medicamento como perdido:', error);
                  }
                }, 5 * 60 * 1000); // 5 minutos
                
                // Armazenar o timeoutId para possível cancelamento
                notificationTimeouts[`${medicationId}_${scheduledTime}`] = timeoutId;
              }
            }
          } catch (error) {
            console.error('❌ Erro ao processar notificação:', error);
          }
        });
        
        console.log('Notificações configuradas com sucesso');
        
        return () => {
          // Limpar todos os timeouts pendentes
          console.log('Limpando timeouts de notificação...');
          Object.values(notificationTimeouts).forEach(clearTimeout);
          
          // Limpar o listener de notificações
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
  const scheduleNotification = async (medication, scheduledTime) => {
    // 1. Validação inicial dos parâmetros
    if (!medication || typeof medication !== 'object') {
      console.error('❌ Erro: Objeto de medicamento inválido ou não fornecido');
      return null;
    }

    const medicationId = medication.id;
    const medicationName = medication.name || 'Medicamento desconhecido';
    const isReminder = !!medication.isReminder;
    const reminderNumber = medication.reminderNumber || 0;
    const reminderText = medication.reminderText || '';

    console.log(`\n📝 Iniciando agendamento de ${isReminder ? 'lembrete' : 'notificação principal'}`);
    console.log(`💊 Medicamento: ${medicationName} (ID: ${medicationId})`);
    console.log(`⏰ Horário solicitado: ${scheduledTime}`);

    try {
      // 2. Verificar e solicitar permissões de notificação
      console.log('🔒 Verificando permissões de notificação...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        console.log('ℹ️  Solicitando permissão de notificação...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('⚠️  Aviso: Permissão de notificação não concedida pelo usuário');
        return null;
      }
      console.log('✅ Permissão de notificação concedida');

      // 3. Processar e validar a data/hora
      console.log('📅 Processando data/hora da notificação...');
      let notificationDate;
      try {
        if (typeof scheduledTime === 'string') {
          if (scheduledTime.includes('T')) {
            // Formato ISO (2023-01-01T10:00:00)
            notificationDate = new Date(scheduledTime);
          } else if (/^\d{1,2}:\d{2}$/.test(scheduledTime)) {
            // Formato HH:MM
            const [hours, minutes] = scheduledTime.split(':').map(Number);
            notificationDate = new Date();
            notificationDate.setHours(hours, minutes, 0, 0);
            
            // Se o horário já passou hoje, agendar para amanhã
            const now = new Date();
            if (notificationDate <= now) {
              console.log(`⏭️  Horário já passou hoje, agendando para amanhã`);
              notificationDate.setDate(notificationDate.getDate() + 1);
            }
          } else {
            throw new Error(`Formato de horário não reconhecido: ${scheduledTime}`);
          }
        } else if (scheduledTime instanceof Date) {
          notificationDate = new Date(scheduledTime); // Criar uma nova instância
        } else {
          throw new Error(`Tipo de data/hora inválido: ${typeof scheduledTime}`);
        }
        
        // Validar se a data é válida
        if (isNaN(notificationDate.getTime())) {
          throw new Error('Data inválida após conversão');
        }
        
        console.log(`📆 Data/hora processada: ${notificationDate.toLocaleString('pt-BR')}`);
      } catch (error) {
        console.error(`❌ Erro ao processar data/hora: ${error.message}`);
        return null;
      }
      
      // 4. Criar uma cópia da data para evitar modificar a original
      const notificationDateCopy = new Date(notificationDate);
      
      // 5. Ajustar para o fuso horário local (mas não modificar a data)
      const timezoneOffset = notificationDateCopy.getTimezoneOffset() * 60000;
      const localTime = new Date(notificationDateCopy.getTime() - timezoneOffset);
      
      // 6. Verificar se a data não está no passado (com tolerância de 1 minuto)
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000); // 1 minuto atrás
      
      console.log(`🕒 Verificando se a data está no passado:`);
      console.log(`   - Data da notificação: ${localTime.toLocaleString('pt-BR')}`);
      console.log(`   - Agora: ${now.toLocaleString('pt-BR')}`);
      
      if (notificationDateCopy <= oneMinuteAgo) {
        console.log(`⏭️  Data/hora no passado (${localTime.toLocaleString('pt-BR')}), ajustando para amanhã`);
        notificationDateCopy.setDate(notificationDateCopy.getDate() + 1);
        // Atualiza a data de notificação para a cópia modificada
        notificationDate = new Date(notificationDateCopy);
      } else {
        console.log('✅ Data/hora da notificação está no futuro, prosseguindo com o agendamento');
      }
      
      // 7. Criar um ID único para a notificação
      const notificationId = `${medicationId}_${notificationDate.getTime()}`;
      if (isReminder) {
        console.log(`   #${reminderNumber} ID: ${notificationId}`);
      }
      
      // 7. Verificar se já existe uma notificação agendada com o mesmo ID
      console.log('🔍 Verificando notificações duplicadas...');
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const existingNotification = scheduledNotifications.find(
        n => n.content.data.uniqueId === notificationId
      );
      
      if (existingNotification) {
        console.log('ℹ️  Notificação já agendada anteriormente, pulando...');
        return notificationId;
      }
      
      // 8. Preparar o conteúdo da notificação
      console.log('📝 Preparando conteúdo da notificação...');
      const notificationContent = {
        title: isReminder 
          ? (reminderNumber === notificationSettings.maxReminders 
              ? '⏰ Último Lembrete!' 
              : '🔔 Lembrete de Medicamento')
          : '💊 Hora do Medicamento',
        
        body: isReminder && reminderText 
          ? reminderText 
          : `Está na hora de tomar ${medicationName}${medication.dosage ? ` (${medication.dosage})` : ''}`,
        
        sound: notificationSettings.soundEnabled,
        vibrate: notificationSettings.vibrationEnabled ? [0, 250, 250, 250] : undefined,
        channelId: 'medication-reminders',
        priority: 'high',
        data: { 
          medicationId,
          scheduledTime: notificationDate.toISOString(),
          medicationName: medicationName,
          isReminder,
          reminderNumber,
          uniqueId: notificationId,
          timestamp: Date.now()
        },
      };

      // 9. Agendar a notificação
      console.log('⏳ Agendando notificação...');
      const scheduledId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: notificationDate, // Usando o objeto Date diretamente
      });
      
      // 10. Log de sucesso
      console.log(`✅ Notificação agendada com sucesso!`);
      console.log(`   ID: ${scheduledId}`);
      console.log(`   Para: ${notificationDate.toLocaleString('pt-BR')}`);
      console.log(`   Tipo: ${isReminder ? `Lembrete ${reminderNumber}/${notificationSettings.maxReminders}` : 'Notificação Principal'}`);
      
      return scheduledId;
      
    } catch (error) {
      console.error('❌ ERRO CRÍTICO ao agendar notificação:', error);
      return null;
    }
  };
  
  // Agendar todas as notificações para um medicamento
  const scheduleNotificationsForMedication = async (medication) => {
    try {
      // Validação inicial dos parâmetros
      if (!medication || !medication.id) {
        console.error('Objeto de medicamento inválido ou sem ID');
        return false;
      }
      
      if (!Array.isArray(medication.timeOfDay) || medication.timeOfDay.length === 0) {
        console.error('Nenhum horário definido para o medicamento ou formato inválido');
        return false;
      }
      
      console.log(`\n=== INICIANDO AGENDAMENTO ===`);
      console.log(`Medicamento: ${medication.name} (ID: ${medication.id})`);
      console.log(`Horários: ${medication.timeOfDay.join(', ')}`);
      
      // 1. Primeiro, cancelamos todas as notificações existentes para este medicamento
      console.log('\n🔍 Cancelando notificações existentes...');
      const cancelSuccess = await cancelNotificationsForMedication(medication.id);
      if (!cancelSuccess) {
        console.warn('⚠️ Aviso: Não foi possível cancelar todas as notificações existentes');
        // Continuamos mesmo assim, pois pode ser o primeiro agendamento
      }
      
      // 2. Para cada horário do medicamento, agendamos uma notificação principal
      console.log('\n⏰ Iniciando agendamento de notificações principais...');
      let totalScheduled = 0;
      let totalFailed = 0;
      
      for (const timeStr of medication.timeOfDay) {
        try {
          // Validar formato do horário (HH:MM)
          if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr)) {
            console.error(`Formato de horário inválido: ${timeStr}`);
            totalFailed++;
            continue;
          }
          
          console.log(`\n🔄 Processando horário: ${timeStr}`);
          
          // Criar data para hoje com o horário especificado
          const [hours, minutes] = timeStr.split(':').map(Number);
          const notificationDate = new Date();
          notificationDate.setHours(hours, minutes, 0, 0);
          
          // Se o horário já passou hoje, agendamos para amanhã
          const now = new Date();
          if (notificationDate <= now) {
            console.log(`⏭️  Horário ${timeStr} já passou hoje, agendando para amanhã`);
            notificationDate.setDate(notificationDate.getDate() + 1);
          }
          
          console.log(`📅 Agendando notificação principal para: ${notificationDate.toLocaleString('pt-BR')}`);
          
          // 3. Agendar notificação principal
          const notificationId = await scheduleNotification(medication, notificationDate);
          
          if (!notificationId) {
            console.error(`❌ Falha ao agendar notificação principal para ${medication.name} às ${timeStr}`);
            totalFailed++;
            continue;
          }
          
          console.log(`✅ Notificação principal agendada com sucesso! ID: ${notificationId}`);
          totalScheduled++;
          
          // 4. Se configurado, agendar lembretes adicionais
          if (notificationSettings.maxReminders > 0 && notificationSettings.reminderInterval > 0) {
            console.log(`\n🔔 Configurando ${notificationSettings.maxReminders} lembretes com intervalo de ${notificationSettings.reminderInterval} minutos`);
            
            for (let i = 1; i <= notificationSettings.maxReminders; i++) {
              const reminderDate = new Date(notificationDate);
              const minutesToAdd = i * notificationSettings.reminderInterval;
              reminderDate.setMinutes(reminderDate.getMinutes() + minutesToAdd);
              
              // Determinar o texto do lembrete
              let reminderText = `Lembrete: Você ainda não tomou ${medication.name}`;
              if (i === notificationSettings.maxReminders) {
                reminderText = `⏰ Último lembrete: ${medication.name} será marcado como perdido se não for tomado`;
              }
              
              console.log(`   📌 Lembrete ${i}/${notificationSettings.maxReminders} para: ${reminderDate.toLocaleString('pt-BR')}`);
              
              // Criar um objeto de lembrete com as informações necessárias
              const reminderMedication = {
                ...medication,
                isReminder: true,
                reminderNumber: i,
                reminderText: reminderText
              };
              
              // Agendar o lembrete
              const reminderId = await scheduleNotification(reminderMedication, reminderDate);
              
              if (reminderId) {
                console.log(`   ✅ Lembrete ${i} agendado com sucesso!`);
                totalScheduled++;
              } else {
                console.error(`   ❌ Falha ao agendar lembrete ${i}`);
                totalFailed++;
              }
            }
          }
        } catch (innerError) {
          console.error(`⚠️ Erro inesperado ao processar horário ${timeStr}:`, innerError);
          totalFailed++;
        }
      }
      
      // 5. Relatório final
      console.log('\n📊 RESUMO DO AGENDAMENTO:');
      console.log(`✅ Notificações agendadas com sucesso: ${totalScheduled}`);
      if (totalFailed > 0) {
        console.warn(`⚠️ Falhas no agendamento: ${totalFailed}`);
      }
      
      return totalScheduled > 0; // Retorna true se pelo menos uma notificação foi agendada
      
    } catch (error) {
      console.error('❌ ERRO CRÍTICO ao agendar notificações:', error);
      return false;
    }
  };
  
  // Cancelar todas as notificações para um medicamento
  const cancelNotificationsForMedication = async (medicationId) => {
    try {
      if (!medicationId) {
        console.warn('ID do medicamento não fornecido para cancelamento de notificações');
        return false;
      }
      
      console.log(`Iniciando cancelamento de notificações para o medicamento: ${medicationId}`);
      
      // Obter todas as notificações agendadas
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`Total de notificações agendadas: ${scheduledNotifications.length}`);
      
      // Filtrar notificações para este medicamento
      const medicationNotifications = scheduledNotifications.filter(
        notification => notification.content.data?.medicationId === medicationId
      );
      
      console.log(`Encontradas ${medicationNotifications.length} notificações para o medicamento ${medicationId}`);
      
      // Cancelar cada notificação
      let successCount = 0;
      let errorCount = 0;
      
      for (const notification of medicationNotifications) {
        try {
          console.log(`Cancelando notificação: ${notification.identifier}`, {
            title: notification.content.title,
            scheduledTime: notification.content.data?.scheduledTime || 'não especificado',
            isReminder: notification.content.data?.isReminder || false
          });
          
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          console.log(`✅ Notificação cancelada com sucesso: ${notification.identifier}`);
          successCount++;
        } catch (error) {
          console.error(`❌ Falha ao cancelar notificação ${notification.identifier}:`, error);
          errorCount++;
        }
      }
      
      console.log(`Cancelamento concluído. Sucessos: ${successCount}, Falhas: ${errorCount}`);
      
      return errorCount === 0; // Retorna true apenas se todas as operações foram bem-sucedidas
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
        checkScheduledNotifications, // Adicionando a função ao contexto
      }}
    >
      {children}
    </MedicationContext.Provider>
  );
};
