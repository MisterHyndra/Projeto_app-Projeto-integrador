import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useMedication } from '../contexts/MedicationContext';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { ApiContext } from '../contexts/ApiContext';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { medications: userMedications, logMedicationTaken } = useMedication();
  const [medications, setMedications] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [adherenceRate, setAdherenceRate] = useState(85); // Valor de exemplo

  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      navigation.replace('Welcome');
    }
  };

  // Atualizar medicamentos quando o contexto mudar
  useEffect(() => {
    // Sempre atualizar os medicamentos, mesmo que a lista esteja vazia
    setMedications(userMedications || []);
    
    // Criar agendamentos com base nos medicamentos
    const now = new Date();
    const schedulesList = [];
    
    if (userMedications && userMedications.length > 0) {
      userMedications.forEach(med => {
        if (med.timeOfDay && med.timeOfDay.length > 0) {
          med.timeOfDay.forEach((time, index) => {
            const [hours, minutes] = time.split(':').map(Number);
            const scheduleDate = new Date(now);
            scheduleDate.setHours(hours, minutes, 0, 0);
            
            // Se o horário já passou hoje, agendar para amanhã
            if (scheduleDate < now) {
              scheduleDate.setDate(scheduleDate.getDate() + 1);
            }
            
            schedulesList.push({
              id: `${med.id}_${index}`,
              medicationId: med.id,
              scheduledTime: scheduleDate.toISOString(),
              taken: false,
              skipped: false
            });
          });
        }
      });
    }
    
    setSchedules(schedulesList);
    
    // Registrar no console para debug
    console.log(`HomeScreen: Medicamentos atualizados - ${userMedications?.length || 0} medicamentos encontrados`);
    console.log(`HomeScreen: Agendamentos criados - ${schedulesList.length} agendamentos`);
  }, [userMedications]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom Dia';
    if (hour < 18) return 'Boa Tarde';
    return 'Boa Noite';
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const isToday = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  // Filtrar próximos agendamentos
  const upcomingSchedules = schedules
    .filter(schedule => new Date(schedule.scheduledTime) > new Date() && !schedule.taken && !schedule.skipped)
    .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())
    .slice(0, 3);

  // Obter medicamento pelo ID
  const getMedicationById = (id) => {
    return medications.find(med => med.id === id);
  };

  // Marcar medicamento como tomado
  const markMedicationTaken = (id) => {
    // Encontrar o medicamento e o agendamento correspondente
    const medication = medications.find(med => med.id === id);
    const schedule = schedules.find(s => s.medicationId === id && !s.taken && !s.skipped);
    
    if (medication) {
      // Atualizar o estado local dos agendamentos
      if (schedule) {
        setSchedules(schedules.map(s => 
          s.id === schedule.id ? { ...s, taken: true } : s
        ));
      }
      
      // Obter o horário agendado ou usar o horário atual
      const scheduledTime = schedule?.scheduledTime || new Date().toISOString();
      
      // Registrar no histórico usando a função do contexto
      logMedicationTaken(id, scheduledTime);
      console.log(`Medicamento ${medication.name} (${id}) marcado como tomado às ${new Date().toLocaleTimeString()}`);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <LinearGradient
          colors={['#4A90E2', '#50C878']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        />
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{user?.nome || 'Usuário'}</Text>
        </View>
      </View>

      <View style={styles.adherenceCard}>
        <View style={styles.adherenceHeader}>
          <Text style={styles.adherenceTitle}>Adesão aos Medicamentos</Text>
          <View style={[styles.adherenceBadge, { 
            backgroundColor: adherenceRate >= 80 ? '#E6F7EF' : 
                          adherenceRate >= 50 ? '#FFF8E6' : '#FFE8EC' 
          }]}>
            <Text style={[styles.adherenceBadgeText, {
              color: adherenceRate >= 80 ? '#059669' : 
                    adherenceRate >= 50 ? '#D97706' : '#DC2626'
            }]}>
              {adherenceRate}%
            </Text>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground} />
          <View style={[styles.progressFill, { width: `${adherenceRate}%` }]} />
        </View>
        
        <View style={styles.adherenceStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{schedules.filter(s => isToday(s.scheduledTime)).length}</Text>
            <Text style={styles.statLabel}>Hoje</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{medications.length}</Text>
            <Text style={styles.statLabel}>Medicamentos</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {schedules.filter(s => s.taken).length}/{schedules.length}
            </Text>
            <Text style={styles.statLabel}>Tomados</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Próximos Medicamentos</Text>
          <TouchableOpacity 
            style={styles.seeAllButton}
            onPress={() => navigation.navigate('MedicationsTab')}
          >
            <Text style={styles.seeAllText}>Ver Todos</Text>
            <Ionicons name="arrow-forward" size={16} color="#4A90E2" />
          </TouchableOpacity>
        </View>

        {upcomingSchedules.length > 0 ? (
          upcomingSchedules.map((schedule, index) => {
            const medication = getMedicationById(schedule.medicationId);
            if (!medication) return null;
            
            return (
              <View key={index} style={styles.medicationCard}>
                <View style={[styles.medicationColorStrip, { backgroundColor: medication.color }]} />
                <View style={styles.medicationInfo}>
                  <Text style={styles.medicationName}>{medication.name}</Text>
                  <Text style={styles.medicationDosage}>{medication.dosage}</Text>
                  <View style={styles.timeContainer}>
                    <Ionicons name="time-outline" size={14} color="#718096" style={{ marginRight: 4 }} />
                    <Text style={styles.medicationTime}>
                      {formatTime(schedule.scheduledTime)} • {formatDate(schedule.scheduledTime)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.markTakenButton}
                  onPress={() => markMedicationTaken(medication.id)}
                >
                  <Ionicons name="checkmark" size={18} color="#50C878" />
                </TouchableOpacity>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar" size={40} color="#A0AEC0" />
            <Text style={styles.emptyStateText}>Sem medicamentos agendados</Text>
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate('MedicationsTab')}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Adicionar Medicamento</Text>
      </TouchableOpacity>

      {/* Botão de sair foi removido conforme solicitado */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    height: 180,
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  headerContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  adherenceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  adherenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  adherenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
  },
  adherenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  adherenceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#EDF2F7',
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#EDF2F7',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#50C878',
    borderRadius: 4,
  },
  adherenceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  statLabel: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A90E2',
    marginRight: 4,
  },
  medicationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medicationColorStrip: {
    width: 8,
    backgroundColor: '#4A90E2',
  },
  medicationInfo: {
    flex: 1,
    padding: 16,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medicationTime: {
    fontSize: 12,
    color: '#718096',
  },
  markTakenButton: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#EDF2F7',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#4A90E2',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#A0AEC0',
    marginTop: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE8EC',
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 8,
  },
});
