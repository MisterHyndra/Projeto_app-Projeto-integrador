import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from './AuthContext';

const MedicationContext = createContext();

export const useMedication = () => useContext(MedicationContext);

export const MedicationProvider = ({ children }) => {
  const [medications, setMedications] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
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
      const newMedication = {
        id: Date.now().toString(),
        ...medicationData,
        createdAt: new Date().toISOString(),
      };
      
      // Adicionar o novo medicamento à lista
      const updatedMedications = [...medications, newMedication];
      setMedications(updatedMedications);
      
      // Salvar imediatamente no AsyncStorage para garantir persistência
      if (isAuthenticated && user?.id) {
        await AsyncStorage.setItem(`medications_${user.id}`, JSON.stringify(updatedMedications));
      }
      
      // Adicionar ao histórico
      const historyEntry = {
        id: Date.now().toString(),
        type: 'add',
        status: 'taken', // Definir o status como 'taken' por padrão
        medicationId: newMedication.id,
        medicationName: newMedication.name,
        timestamp: new Date().toISOString(),
      };
      
      const updatedHistory = [...history, historyEntry];
      setHistory(updatedHistory);
      
      // Salvar histórico no AsyncStorage
      if (isAuthenticated && user?.id) {
        await AsyncStorage.setItem(`history_${user.id}`, JSON.stringify(updatedHistory));
      }
      
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
      
      const logEntry = {
        id: Date.now().toString(),
        medicationId,
        medicationName: medication.name,
        scheduledTime,
        takenAt: new Date().toISOString(),
        status: 'taken',
      };
      
      setHistory(prevHistory => [...prevHistory, logEntry]);
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
      
      const logEntry = {
        id: Date.now().toString(),
        medicationId,
        medicationName: medication.name,
        scheduledTime,
        missedAt: new Date().toISOString(),
        status: 'missed',
      };
      
      setHistory(prevHistory => [...prevHistory, logEntry]);
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
    const today = new Date();
    const dayOfWeek = format(today, 'EEEE', { locale: ptBR });
    
    return medications.filter(med => {
      // Verificar se o medicamento está dentro do período de tratamento
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
      } else if (med.frequency === 'weekly' && med.daysOfWeek) {
        return med.daysOfWeek.includes(dayOfWeek.toLowerCase());
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
      }}
    >
      {children}
    </MedicationContext.Provider>
  );
};
