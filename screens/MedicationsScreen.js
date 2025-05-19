import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMedication } from '../contexts/MedicationContext';
import { format } from 'date-fns';

export default function MedicationsScreen() {
  const { medications, loading, addMedication, updateMedication, deleteMedication } = useMedication();
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentMedication, setCurrentMedication] = useState(null);
  
  // Estados para o formulário
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(null);
  const [instructions, setInstructions] = useState('');
  const [color, setColor] = useState('#4A90E2');

  // Abrir modal para adicionar medicamento
  const handleAddMedication = () => {
    setEditMode(false);
    setCurrentMedication(null);
    resetForm();
    setModalVisible(true);
  };

  // Abrir modal para editar medicamento
  const handleEditMedication = (medication) => {
    setEditMode(true);
    setCurrentMedication(medication);
    // Preencher o formulário com os dados do medicamento
    setName(medication.name);
    setDosage(medication.dosage);
    setFrequency(medication.frequency || 'daily');
    setSelectedTimes(medication.timeOfDay || []);
    setDaysOfWeek(medication.daysOfWeek || []);
    setStartDate(medication.startDate ? new Date(medication.startDate) : new Date());
    setEndDate(medication.endDate ? new Date(medication.endDate) : null);
    setInstructions(medication.instructions || '');
    setColor(medication.color || '#4A90E2');
    setModalVisible(true);
  };

  // Salvar medicamento (adicionar ou atualizar)
  const handleSaveMedication = async () => {
    try {
      const medicationData = {
        name,
        dosage,
        frequency,
        timeOfDay: selectedTimes,
        daysOfWeek: frequency === 'weekly' ? daysOfWeek : undefined,
        startDate: startDate.toISOString(),
        endDate: endDate ? endDate.toISOString() : undefined,
        instructions: instructions || undefined,
        color,
      };

      if (editMode && currentMedication) {
        await updateMedication(currentMedication.id, medicationData);
      } else {
        await addMedication(medicationData);
      }

      setModalVisible(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar medicamento:', error);
    }
  };

  // Excluir medicamento
  const handleDeleteMedication = async (id) => {
    try {
      await deleteMedication(id);
    } catch (error) {
      console.error('Erro ao excluir medicamento:', error);
    }
  };

  // Resetar formulário
  const resetForm = () => {
    setName('');
    setDosage('');
    setFrequency('daily');
    setSelectedTimes([]);
    setDaysOfWeek([]);
    setStartDate(new Date());
    setEndDate(null);
    setInstructions('');
    setColor('#4A90E2');
  };

  // Componente para o cabeçalho da lista
  const ListHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Meus Medicamentos</Text>
      <TouchableOpacity style={styles.addButton} onPress={handleAddMedication}>
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  // Componente para quando a lista está vazia
  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="medical" size={60} color="#A0AEC0" />
      <Text style={styles.emptyTitle}>Sem Medicamentos</Text>
      <Text style={styles.emptyDescription}>
        Adicione seus medicamentos para começar a acompanhar seu tratamento
      </Text>
      <TouchableOpacity style={styles.emptyAddButton} onPress={handleAddMedication}>
        <Text style={styles.emptyAddButtonText}>Adicionar Medicamento</Text>
      </TouchableOpacity>
    </View>
  );

  // Renderizar item da lista
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.medicationCard}
      onPress={() => handleEditMedication(item)}
    >
      <View style={[styles.colorStrip, { backgroundColor: item.color || '#4A90E2' }]} />
      <View style={styles.cardContent}>
        <View style={styles.medicationInfo}>
          <Text style={styles.medicationName}>{item.name}</Text>
          <Text style={styles.medicationDosage}>{item.dosage}</Text>
        </View>
        
        <View style={styles.scheduleInfo}>
          <View style={styles.scheduleRow}>
            <Ionicons name="time-outline" size={16} color="#718096" style={styles.scheduleIcon} />
            <Text style={styles.scheduleText}>
              {item.timeOfDay && item.timeOfDay.join(', ')}
            </Text>
          </View>
          
          <View style={styles.scheduleRow}>
            <Ionicons name="calendar-outline" size={16} color="#718096" style={styles.scheduleIcon} />
            <Text style={styles.scheduleText}>
              {item.frequency === 'daily' ? 'Diariamente' : 
                item.daysOfWeek ? item.daysOfWeek.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ') : ''}
            </Text>
          </View>
        </View>
        
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleEditMedication(item)}
          >
            <Ionicons name="create-outline" size={18} color="#4A90E2" />
            <Text style={styles.actionText}>Editar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteMedication(item.id)}
          >
            <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
            <Text style={[styles.actionText, styles.deleteText]}>Excluir</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      )}
      
      <FlatList
        data={medications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      
      {/* Modal para adicionar/editar medicamento */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editMode ? 'Editar Medicamento' : 'Novo Medicamento'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#718096" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nome do Medicamento*</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="ex: Aspirina, Lisinopril"
                  value={name}
                  onChangeText={setName}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Dosagem*</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="ex: 100mg, 1 comprimido, 2 cápsulas"
                  value={dosage}
                  onChangeText={setDosage}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Cor do Rótulo</Text>
                <View style={styles.colorPicker}>
                  {['#4A90E2', '#50C878', '#FF6B6B', '#FFA500', '#9370DB', '#20B2AA', '#FF69B4'].map((colorOption) => (
                    <TouchableOpacity
                      key={colorOption}
                      style={[styles.colorOption, { backgroundColor: colorOption }, color === colorOption && styles.colorOptionSelected]}
                      onPress={() => setColor(colorOption)}
                    >
                      {color === colorOption && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Frequência*</Text>
                <View style={styles.frequencyButtons}>
                  <TouchableOpacity
                    style={[styles.frequencyButton, frequency === 'daily' && styles.frequencyButtonActive]}
                    onPress={() => setFrequency('daily')}
                  >
                    <Text style={[styles.frequencyButtonText, frequency === 'daily' && styles.frequencyButtonTextActive]}>Diário</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.frequencyButton, frequency === 'weekly' && styles.frequencyButtonActive]}
                    onPress={() => setFrequency('weekly')}
                  >
                    <Text style={[styles.frequencyButtonText, frequency === 'weekly' && styles.frequencyButtonTextActive]}>Semanal</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {frequency === 'weekly' && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Dias da Semana*</Text>
                  <View style={styles.daysContainer}>
                    {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((day, index) => {
                      const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][index];
                      const isSelected = daysOfWeek.includes(dayKey);
                      
                      return (
                        <TouchableOpacity
                          key={dayKey}
                          style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
                          onPress={() => {
                            if (isSelected) {
                              setDaysOfWeek(daysOfWeek.filter(d => d !== dayKey));
                            } else {
                              setDaysOfWeek([...daysOfWeek, dayKey]);
                            }
                          }}
                        >
                          <Text style={[styles.dayButtonText, isSelected && styles.dayButtonTextSelected]}>{day.charAt(0)}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Horário do Dia*</Text>
                <View style={styles.timeContainer}>
                  {selectedTimes.map((time, index) => (
                    <View key={index} style={styles.timeTag}>
                      <Text style={styles.timeTagText}>{time}</Text>
                      <TouchableOpacity
                        style={styles.timeTagRemove}
                        onPress={() => setSelectedTimes(selectedTimes.filter((_, i) => i !== index))}
                      >
                        <Ionicons name="close" size={16} color="#718096" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  
                  <TouchableOpacity
                    style={styles.addTimeButton}
                    onPress={() => {
                      // Abrir um diálogo para selecionar o horário
                      const hours = new Date().getHours();
                      const minutes = new Date().getMinutes();
                      
                      // Formatar o horário atual como padrão
                      const formattedHours = hours.toString().padStart(2, '0');
                      const formattedMinutes = minutes.toString().padStart(2, '0');
                      const currentTime = `${formattedHours}:${formattedMinutes}`;
                      
                      // Usar um horário fixo temporariamente para testes
                      // Em uma implementação real, usaríamos um DateTimePicker
                      const addTime = (hour, minute) => {
                        const formattedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                        if (!selectedTimes.includes(formattedTime)) {
                          setSelectedTimes([...selectedTimes, formattedTime]);
                        }
                      };
                      
                      // Mostrar opções de horários comuns
                      Alert.alert(
                        'Selecionar Horário',
                        'Escolha um horário para o medicamento',
                        [
                          { text: '08:00 (Manhã)', onPress: () => addTime(8, 0) },
                          { text: '12:00 (Meio-dia)', onPress: () => addTime(12, 0) },
                          { text: '18:00 (Tarde)', onPress: () => addTime(18, 0) },
                          { text: '22:00 (Noite)', onPress: () => addTime(22, 0) },
                          { 
                            text: 'Horário Personalizado', 
                            onPress: () => {
                              // Mostrar opções para horas
                              const hoursOptions = [];
                              for (let i = 0; i < 24; i++) {
                                hoursOptions.push({ 
                                  text: i.toString().padStart(2, '0') + ':00', 
                                  onPress: () => {
                                    // Agora mostrar opções para minutos
                                    const minutesOptions = [
                                      { text: '00', onPress: () => addTime(i, 0) },
                                      { text: '15', onPress: () => addTime(i, 15) },
                                      { text: '30', onPress: () => addTime(i, 30) },
                                      { text: '45', onPress: () => addTime(i, 45) },
                                      { text: 'Cancelar', style: 'cancel' }
                                    ];
                                    
                                    Alert.alert(
                                      'Selecionar Minutos',
                                      `Escolha os minutos para ${i.toString().padStart(2, '0')}:XX`,
                                      minutesOptions
                                    );
                                  }
                                });
                              }
                              
                              // Adicionar opção de cancelar
                              hoursOptions.push({ text: 'Cancelar', style: 'cancel' });
                              
                              // Dividir as opções em grupos de manhã, tarde e noite para facilitar
                              Alert.alert(
                                'Selecionar Hora',
                                'Escolha a hora:',
                                [
                                  { text: 'Manhã (00-11)', onPress: () => {
                                    Alert.alert('Selecionar Hora (Manhã)', 'Escolha a hora:', hoursOptions.slice(0, 12));
                                  }},
                                  { text: 'Tarde (12-23)', onPress: () => {
                                    Alert.alert('Selecionar Hora (Tarde)', 'Escolha a hora:', hoursOptions.slice(12, 24));
                                  }},
                                  { text: 'Cancelar', style: 'cancel' }
                                ]
                              );
                            }
                          },
                          { text: 'Cancelar', style: 'cancel' }
                        ]
                      )
                    }}
                  >
                    <Ionicons name="add" size={16} color="#4A90E2" />
                    <Text style={styles.addTimeText}>Adicionar Horário</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Instruções (Opcional)</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  placeholder="ex: Tomar com alimentos, antes de dormir, etc."
                  value={instructions}
                  onChangeText={setInstructions}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveMedication}
              >
                <Text style={styles.saveButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  addButton: {
    backgroundColor: '#4A90E2',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 10,
  },
  listContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  medicationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  colorStrip: {
    height: 8,
    backgroundColor: '#4A90E2',
  },
  cardContent: {
    padding: 16,
  },
  medicationInfo: {
    marginBottom: 12,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 14,
    color: '#718096',
  },
  scheduleInfo: {
    marginBottom: 12,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    padding: 12,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleIcon: {
    marginRight: 8,
  },
  scheduleText: {
    fontSize: 14,
    color: '#4A5568',
  },
  actionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A90E2',
    marginLeft: 4,
  },
  deleteButton: {
    marginLeft: 'auto',
  },
  deleteText: {
    color: '#FF6B6B',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3748',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyAddButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emptyAddButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
  },
  formContainer: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#EDF2F7',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A5568',
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D3748',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2D3748',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  frequencyButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  frequencyButtonText: {
    fontSize: 16,
    color: '#4A5568',
  },
  frequencyButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  dayButtonText: {
    fontSize: 14,
    color: '#4A5568',
  },
  dayButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  timeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF4FF',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  timeTagText: {
    fontSize: 14,
    color: '#4A90E2',
    marginRight: 4,
  },
  timeTagRemove: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  addTimeText: {
    fontSize: 14,
    color: '#4A90E2',
    marginLeft: 4,
  },
});
