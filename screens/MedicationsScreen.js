import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMedication } from '../contexts/MedicationContext';

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
  const [status, setStatus] = useState('scheduled');

  // Estados para o DateTimePicker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('date');
  const [tempDate, setTempDate] = useState(new Date());

  // Funções do DateTimePicker
  const showPicker = (mode) => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
    
    // Para dispositivos Android, o DateTimePicker é exibido como um modal
    // Para iOS, ele é exibido inline
    if (Platform.OS === 'android') {
      // No Android, o DateTimePicker é exibido automaticamente
      console.log(`Abrindo DateTimePicker no modo: ${mode}`);
    }
  };

  const onDateTimeChange = (event, selectedDate) => {
    // No Android, o DateTimePicker é fechado automaticamente após a seleção
    // No iOS, precisamos fechá-lo manualmente
    setShowDatePicker(Platform.OS === 'ios');
    
    // Se o usuário cancelou a seleção, não fazemos nada
    if (event.type === 'dismissed') {
      return;
    }
    
    // Se o usuário selecionou uma data/hora
    if (selectedDate) {
      const currentDate = selectedDate;
      setTempDate(currentDate);
      
      if (datePickerMode === 'date') {
        // Atualiza a data de início
        setStartDate(currentDate);
        console.log(`Data selecionada: ${format(currentDate, 'dd/MM/yyyy')}`);
      } else {
        // Adiciona o horário selecionado à lista
        const timeString = format(currentDate, 'HH:mm');
        if (!selectedTimes.includes(timeString)) {
          setSelectedTimes([...selectedTimes, timeString].sort());
          console.log(`Horário adicionado: ${timeString}`);
        }
      }
    }
  };

  // Adicionar um horário específico
  const addTime = (hour, minute) => {
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    if (!selectedTimes.includes(timeString)) {
      setSelectedTimes([...selectedTimes, timeString].sort());
    }
  };

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
    setName(medication.name);
    setDosage(medication.dosage);
    setFrequency(medication.frequency || 'daily');
    setSelectedTimes(medication.timeOfDay || []);
    setDaysOfWeek(medication.daysOfWeek || []);
    setStartDate(medication.startDate ? new Date(medication.startDate) : new Date());
    setEndDate(medication.endDate ? new Date(medication.endDate) : null);
    setInstructions(medication.instructions || '');
    setColor(medication.color || '#4A90E2');
    setStatus(medication.status || 'scheduled');
    setModalVisible(true);
  };

  // Salvar medicamento
  const handleSaveMedication = async () => {
    try {
      if (!name || !dosage || selectedTimes.length === 0) {
        Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios');
        return;
      }

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
        status: 'scheduled' // Define o status inicial como agendado
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
      Alert.alert('Erro', 'Não foi possível salvar o medicamento');
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
    setStatus('scheduled');
  };

  // Renderizar item da lista
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.medicationItem, { borderLeftColor: item.color }]}
      onPress={() => handleEditMedication(item)}
    >
      <View style={styles.medicationInfo}>
        <Text style={styles.medicationName}>{item.name}</Text>
        <Text style={styles.medicationDosage}>{item.dosage}</Text>
        <Text style={styles.medicationTime}>
          {item.timeOfDay.join(', ')}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteMedication(item.id)}
      >
        <Ionicons name="trash-outline" size={24} color="#E53E3E" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meus Medicamentos</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddMedication}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4A90E2" style={styles.loader} />
      ) : (
        <FlatList
          data={medications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="medical" size={60} color="#A0AEC0" />
              <Text style={styles.emptyTitle}>Sem Medicamentos</Text>
              <Text style={styles.emptyDescription}>
                Adicione seus medicamentos para começar a acompanhar seu tratamento
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editMode ? 'Editar Medicamento' : 'Novo Medicamento'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#4A5568" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nome do Medicamento*</Text>
                <TextInput
                  style={styles.formInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ex: Dipirona"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Dosagem*</Text>
                <TextInput
                  style={styles.formInput}
                  value={dosage}
                  onChangeText={setDosage}
                  placeholder="Ex: 500mg"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Frequência</Text>
                <View style={styles.frequencyButtons}>
                  <TouchableOpacity
                    style={[
                      styles.frequencyButton,
                      frequency === 'daily' && styles.frequencyButtonActive,
                      { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }
                    ]}
                    onPress={() => setFrequency('daily')}
                  >
                    <Text
                      style={[
                        styles.frequencyButtonText,
                        frequency === 'daily' && styles.frequencyButtonTextActive
                      ]}
                    >
                      Diário
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.frequencyButton,
                      frequency === 'weekly' && styles.frequencyButtonActive,
                      { borderTopRightRadius: 8, borderBottomRightRadius: 8 }
                    ]}
                    onPress={() => setFrequency('weekly')}
                  >
                    <Text
                      style={[
                        styles.frequencyButtonText,
                        frequency === 'weekly' && styles.frequencyButtonTextActive
                      ]}
                    >
                      Semanal
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {frequency === 'weekly' && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Dias da Semana</Text>
                  <View style={styles.daysContainer}>
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.dayButton,
                          daysOfWeek.includes(index) && styles.dayButtonSelected
                        ]}
                        onPress={() => {
                          const updatedDays = daysOfWeek.includes(index)
                            ? daysOfWeek.filter(d => d !== index)
                            : [...daysOfWeek, index];
                          setDaysOfWeek(updatedDays);
                        }}
                      >
                        <Text
                          style={[
                            styles.dayButtonText,
                            daysOfWeek.includes(index) && styles.dayButtonTextSelected
                          ]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Horários*</Text>
                <View style={styles.timeContainer}>
                  {selectedTimes.map((time, index) => (
                    <View key={index} style={styles.timeTag}>
                      <Text style={styles.timeTagText}>{time}</Text>
                      <TouchableOpacity
                        style={styles.timeTagRemove}
                        onPress={() => setSelectedTimes(selectedTimes.filter((_, i) => i !== index))}
                      >
                        <Ionicons name="close-circle" size={16} color="#4A90E2" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.addTimeButton}
                    onPress={() => {
                      // Garantir que o DateTimePicker seja exibido no modo de seleção de hora
                      showPicker('time');
                    }}
                  >
                    <Ionicons name="time" size={16} color="#4A90E2" />
                    <Text style={styles.addTimeText}>Adicionar Horário</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Data de Início*</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => showPicker('date')}
                >
                  <Text style={styles.dateButtonText}>
                    {format(startDate, 'dd/MM/yyyy')}
                  </Text>
                  <Ionicons name="calendar" size={20} color="#4A90E2" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Cor</Text>
                <View style={styles.colorPicker}>
                  {['#4A90E2', '#50E3C2', '#F5A623', '#D0021B', '#9013FE', '#BD10E0', '#7ED321'].map(colorOption => (
                    <TouchableOpacity
                      key={colorOption}
                      style={[
                        styles.colorOption,
                        { backgroundColor: colorOption },
                        color === colorOption && styles.colorOptionSelected
                      ]}
                      onPress={() => setColor(colorOption)}
                    >
                      {color === colorOption && (
                        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Instruções (Opcional)</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={instructions}
                  onChangeText={setInstructions}
                  placeholder="Ex: Tomar com água, antes das refeições..."
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>

            {showDatePicker && (
              <DateTimePicker
                testID="dateTimePicker"
                value={tempDate}
                mode={datePickerMode}
                is24Hour={true}
                display="default"
                onChange={onDateTimeChange}
                minimumDate={datePickerMode === 'date' ? new Date() : undefined}
              />
            )}

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3748',
  },
  addButton: {
    position: 'absolute',
    bottom: 0,       // 🔽 quanto maior, mais para baixo ele fica
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A5568',
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
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyAddButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  medicationItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    overflow: 'hidden',
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
  medicationTime: {
    fontSize: 14,
    color: '#718096',
  },
  deleteButton: {
    padding: 16,
    justifyContent: 'center',
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
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#2D3748',
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
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    justifyContent: 'space-between',
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  colorOptionSelected: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
