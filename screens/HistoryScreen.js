import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMedication } from '../contexts/MedicationContext';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function HistoryScreen({ navigation }) {
  const { history: medicationHistory, clearHistory } = useMedication();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [adherenceRate, setAdherenceRate] = useState(0);
  
  // Usar a data atual para definir a semana atual
  const today = new Date();
  // Ajustar para o fuso horário local para evitar problemas
  today.setHours(0, 0, 0, 0);
  
  // Calcular o início da semana (domingo)
  const startOfWeek = new Date(today);
  const dayOfWeek = today.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
  startOfWeek.setDate(today.getDate() - dayOfWeek); // Voltar para o domingo
  
  // Calcular o fim da semana (sábado)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Avançar 6 dias para o sábado
  endOfWeek.setHours(23, 59, 59, 999); // Definir para o final do dia
  
  const [currentWeek, setCurrentWeek] = useState({
    start: startOfWeek,
    end: endOfWeek,
  });

  // Função para formatar data
  const formatDate = (date) => {
    return format(date, 'dd/MM', { locale: ptBR });
  };
  
  // Função para formatar hora
  const formatTime = (dateString) => {
    if (!dateString) {
      return '--:--';
    }
    
    try {
      const date = parseISO(dateString);
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        console.log('Data inválida ao formatar hora:', dateString);
        return '--:--';
      }
      
      return format(date, 'HH:mm');
    } catch (error) {
      console.error('Erro ao formatar hora:', error, dateString);
      return '--:--';
    }
  };

  // Função para ir para a semana anterior
  const goToPreviousWeek = () => {
    const newStart = new Date(currentWeek.start);
    newStart.setDate(newStart.getDate() - 7);
    
    const newEnd = new Date(currentWeek.end);
    newEnd.setDate(newEnd.getDate() - 7);
    
    setCurrentWeek({ start: newStart, end: newEnd });
  };

  // Função para ir para a próxima semana
  const goToNextWeek = () => {
    const newStart = new Date(currentWeek.start);
    newStart.setDate(newStart.getDate() + 7);
    
    const newEnd = new Date(currentWeek.end);
    newEnd.setDate(newEnd.getDate() + 7);
    
    setCurrentWeek({ start: newStart, end: newEnd });
  };

  // Verificar se é a semana atual
  const isCurrentWeek = () => {
    const today = new Date();
    return today >= currentWeek.start && today <= currentWeek.end;
  };
  
  // Função para limpar o histórico
  const handleClearHistory = async () => {
    Alert.alert(
      'Limpar Histórico',
      'Tem certeza que deseja limpar todo o histórico de medicamentos? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Limpar', 
          style: 'destructive',
          onPress: async () => {
            const success = await clearHistory();
            if (success) {
              Alert.alert('Sucesso', 'Histórico limpo com sucesso!');
            } else {
              Alert.alert('Erro', 'Não foi possível limpar o histórico. Tente novamente.');
            }
          }
        }
      ]
    );
  };
  
  // Filtrar histórico com base na semana selecionada e no filtro
  useEffect(() => {
    if (!medicationHistory || medicationHistory.length === 0) {
      setFilteredHistory([]);
      setAdherenceRate(0);
      return;
    }
    
    // Criar cópias das datas para evitar modificações indesejadas
    const weekStart = new Date(currentWeek.start);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(currentWeek.end);
    weekEnd.setHours(23, 59, 59, 999);
    
    // Filtrar por semana
    const weeklyHistory = medicationHistory.filter(item => {
      // Verificar se o item tem uma data válida
      if (!item.timestamp && !item.takenAt && !item.missedAt && !item.date) {
        console.log('Item sem data válida:', item);
        return false;
      }
      
      try {
        // Usar a data mais apropriada disponível
        let itemDateStr = item.date || item.timestamp || item.takenAt || item.missedAt;
        
        // Se ainda não tiver data válida, pular este item
        if (!itemDateStr) {
          console.log('Item com data inválida:', item);
          return false;
        }
        
        const itemDate = parseISO(itemDateStr);
        
        // Verificar se a data é válida
        if (isNaN(itemDate.getTime())) {
          console.log('Data inválida após parse:', itemDateStr);
          return false;
        }
        
        // Verificar se a data está dentro do intervalo da semana
        return isWithinInterval(itemDate, { start: weekStart, end: weekEnd });
      } catch (error) {
        console.error('Erro ao processar data do item:', error, item);
        return false;
      }
    });
    
    // Filtrar por status (tomado/perdido/agendado)
    let filtered = weeklyHistory;
    if (selectedFilter === 'taken') {
      filtered = weeklyHistory.filter(item => item.status === 'taken' || item.status === 'tomado');
    } else if (selectedFilter === 'missed') {
      filtered = weeklyHistory.filter(item => item.status === 'missed' || item.status === 'perdido');
    } else if (selectedFilter === 'scheduled') {
      filtered = weeklyHistory.filter(item => item.status === 'scheduled');
    }
    
    setFilteredHistory(filtered);
    
    // Calcular taxa de adesão
    if (weeklyHistory.length > 0) {
      // Contar apenas medicamentos tomados ou perdidos (ignorar agendados)
      const relevantItems = weeklyHistory.filter(item => 
        item.status === 'taken' || item.status === 'tomado' || 
        item.status === 'missed' || item.status === 'perdido'
      );
      
      if (relevantItems.length > 0) {
        const takenCount = relevantItems.filter(item => 
          item.status === 'taken' || item.status === 'tomado'
        ).length;
        
        const adherence = Math.round((takenCount / relevantItems.length) * 100);
        setAdherenceRate(adherence);
      } else {
        // Se só houver medicamentos agendados, mostrar 0%
        setAdherenceRate(0);
      }
    } else {
      setAdherenceRate(0);
    }
  }, [medicationHistory, currentWeek, selectedFilter]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Histórico de Medicamentos</Text>
        <TouchableOpacity onPress={handleClearHistory} style={styles.clearButton}>
          <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
          <Text style={styles.clearButtonText}>Limpar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekSelector}>
        <TouchableOpacity onPress={goToPreviousWeek} style={styles.arrowButton}>
          <Ionicons name="chevron-back" size={20} color="#4A90E2" />
        </TouchableOpacity>
        
        <View style={styles.weekInfo}>
          <Text style={styles.weekText}>
            {formatDate(currentWeek.start)} - {formatDate(currentWeek.end)}, {currentWeek.end.getFullYear()}
          </Text>
          {isCurrentWeek() && <Text style={styles.currentWeekBadge}>Semana Atual</Text>}
          <Text style={styles.todayDate}>Hoje: {format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}</Text>
        </View>
        
        <TouchableOpacity 
          onPress={goToNextWeek} 
          style={styles.arrowButton}
          disabled={isCurrentWeek()}
        >
          <Ionicons name="chevron-forward" size={20} color={isCurrentWeek() ? '#CBD5E0' : '#4A90E2'} />
        </TouchableOpacity>
      </View>

      <View style={styles.adherenceSummary}>
        <Text style={styles.summaryTitle}>Adesão Semanal</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground} />
          <View style={[styles.progressFill, { 
            width: `${adherenceRate}%`,
            backgroundColor: adherenceRate >= 80 ? '#50C878' : 
                            adherenceRate >= 50 ? '#FCC419' : '#FF6B6B'
          }]} />
        </View>
        <Text style={styles.adherenceText}>
          {adherenceRate}% dos medicamentos tomados esta semana
        </Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>
            Todos
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterButton, selectedFilter === 'taken' && styles.filterButtonActive]}
          onPress={() => setSelectedFilter('taken')}
        >
          <Text style={[styles.filterText, selectedFilter === 'taken' && styles.filterTextActive]}>
            Tomados
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterButton, selectedFilter === 'missed' && styles.filterButtonActive]}
          onPress={() => setSelectedFilter('missed')}
        >
          <Text style={[styles.filterText, selectedFilter === 'missed' && styles.filterTextActive]}>
            Perdidos
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterButton, selectedFilter === 'scheduled' && styles.filterButtonActive]}
          onPress={() => setSelectedFilter('scheduled')}
        >
          <Text style={[styles.filterText, selectedFilter === 'scheduled' && styles.filterTextActive]}>
            Agendados
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.historyLabel}>Histórico ({filteredHistory.length})</Text>

      <ScrollView style={styles.historyList} contentContainerStyle={styles.historyContent}>
        {filteredHistory.length > 0 ? (
          filteredHistory.map((item, index) => {
            // Determinar o status e as cores com base no status do item
            const isTaken = item.status === 'taken' || item.status === 'tomado';
            const isScheduled = item.status === 'scheduled';
            const isMissed = item.status === 'missed' || item.status === 'perdido';
            
            // Definir cores e texto com base no status
            const statusColor = isTaken ? '#50C878' : isScheduled ? '#4A90E2' : '#FF6B6B';
            const statusText = isTaken ? 'Tomado' : isScheduled ? 'Agendado' : 'Perdido';
            
            // Formatar a data e hora
            let dateTimeText = 'Data não disponível';
            if (item.timestamp) {
              dateTimeText = `${formatTime(item.timestamp)} • ${format(parseISO(item.timestamp), 'dd/MM/yyyy')}`;
            } else if (item.takenAt) {
              dateTimeText = `${formatTime(item.takenAt)} • ${format(parseISO(item.takenAt), 'dd/MM/yyyy')}`;
            } else if (item.date) {
              dateTimeText = format(parseISO(item.date), 'dd/MM/yyyy');
            }
            
            return (
              <View key={index} style={styles.historyItem}>
                <View style={styles.historyItemLeft}>
                  <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                  <View>
                    <Text style={styles.medicationName}>{item.medicationName}</Text>
                    <Text style={styles.historyTime}>{dateTimeText}</Text>
                  </View>
                </View>
                <View style={styles.historyItemRight}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {statusText}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color="#A0AEC0" />
            <Text style={styles.emptyStateText}>Sem histórico para este período</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
    marginLeft: 4,
  },
  weekSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  arrowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekInfo: {
    alignItems: 'center',
  },
  weekText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4,
  },
  currentWeekBadge: {
    fontSize: 12,
    color: '#4A90E2',
    marginBottom: 4,
  },
  todayDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A5568',
    marginTop: 2,
  },
  adherenceSummary: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 12,
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#EDF2F7',
    borderRadius: 4,
    marginBottom: 8,
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
  adherenceText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#718096',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#EDF2F7',
  },
  filterButtonActive: {
    backgroundColor: '#4A90E2',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#718096',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  historyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  historyList: {
    flex: 1,
  },
  historyContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D3748',
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 14,
    color: '#718096',
  },
  historyItemRight: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    borderStyle: 'dashed',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#A0AEC0',
    marginTop: 12,
    textAlign: 'center',
  },
});
