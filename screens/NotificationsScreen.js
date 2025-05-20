import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMedication } from '../contexts/MedicationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const { notificationSettings, medications, savedNotifications, upcomingNotifications, checkScheduledNotifications } = useMedication();
  const { isAuthenticated, user } = { isAuthenticated: true, user: { id: 'user1' } }; // Simulando contexto de autenticação

  // Atualizar as notificações quando o componente for montado ou quando o foco mudar
  useEffect(() => {
    setNotifications(savedNotifications || []);
    
    // Verificar notificações agendadas quando a tela receber foco
    const unsubscribe = navigation.addListener('focus', () => {
      checkScheduledNotifications();
    });
    
    // Verificar notificações agendadas imediatamente
    checkScheduledNotifications();
    
    return unsubscribe;
  }, [navigation, savedNotifications, checkScheduledNotifications]);

  // Função para marcar notificação como lida
  const handleNotificationPress = (id) => {
    // Esta função agora é apenas visual, pois as notificações são gerenciadas pelo MedicationContext
    const updatedNotifications = notifications.map(notification => 
      notification.id === id 
        ? { ...notification, isRead: true } 
        : notification
    );
    
    setNotifications(updatedNotifications);
  };

  // Função para limpar todas as notificações
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Renderiza um item da lista de notificações
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.notificationItem, 
        !item.isRead && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item.id)}
    >
      <View style={[
        styles.iconContainer, 
        { backgroundColor: item.isEmergency ? '#FFE8EC' : '#E6F7EF' }
      ]}>
        {item.isEmergency ? (
          <Ionicons name="alert-triangle" size={20} color="#FF6B6B" />
        ) : (
          <Ionicons name="notifications" size={20} color="#50C878" />
        )}
      </View>
      
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationBody}>{item.body}</Text>
        <Text style={styles.notificationTime}>
          {item.time} • {item.date}
        </Text>
      </View>
      
      {!item.isRead && (
        <View style={styles.unreadIndicator} />
      )}
    </TouchableOpacity>
  );

  // Componente para quando a lista está vazia
  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications" size={60} color="#A0AEC0" />
      <Text style={styles.emptyTitle}>Sem Notificações</Text>
      <Text style={styles.emptyDescription}>
        Você está em dia! Notificações sobre seus medicamentos aparecerão aqui.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notificações</Text>
        {notifications.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={clearAllNotifications}
          >
            <Ionicons name="trash-outline" size={16} color="#718096" />
            <Text style={styles.clearButtonText}>Limpar Tudo</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView style={styles.settingsContainer}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Configurações de Notificação</Text>
          <View style={styles.divider} />
          
          <View style={styles.settingRow}>
            <Text style={styles.label}>Som:</Text>
            <Text style={styles.value}>
              {notificationSettings?.soundEnabled ? 'Ativado' : 'Desativado'}
            </Text>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.label}>Vibração:</Text>
            <Text style={styles.value}>
              {notificationSettings?.vibrationEnabled ? 'Ativada' : 'Desativada'}
            </Text>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.label}>Intervalo entre lembretes:</Text>
            <Text style={styles.value}>
              {notificationSettings?.reminderInterval} minutos
            </Text>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.label}>Máximo de lembretes:</Text>
            <Text style={styles.value}>
              {notificationSettings?.maxReminders}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Próximas Notificações</Text>
          <View style={styles.divider} />
          {upcomingNotifications && upcomingNotifications.length > 0 ? (
            <FlatList
              data={upcomingNotifications}
              renderItem={({ item }) => (
                <View style={styles.upcomingNotificationItem}>
                  <View style={styles.upcomingIconContainer}>
                    <Ionicons name="time-outline" size={18} color="#4A90E2" />
                  </View>
                  <View style={styles.upcomingContent}>
                    <Text style={styles.upcomingTitle}>{item.medicationName}</Text>
                    <Text style={styles.upcomingTime}>{item.time} • {item.date}</Text>
                  </View>
                </View>
              )}
              keyExtractor={(item) => item.id || item.medicationId + item.time}
              scrollEnabled={false}
              nestedScrollEnabled={true}
            />
          ) : (
            <Text style={styles.infoText}>
              As notificações serão exibidas aqui quando houver medicamentos agendados.
            </Text>
          )}
        </View>
      </ScrollView>

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id || String(item.timestamp)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={ListEmptyComponent}
      />
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
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF2F7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  clearButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#718096',
  },
  settingsContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  label: {
    fontSize: 16,
    color: '#4A5568',
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D3748',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#718096',
    fontStyle: 'italic',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadNotification: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
    marginLeft: 8,
    alignSelf: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    flex: 1,
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
    maxWidth: 300,
  },
  upcomingNotificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  upcomingIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E6F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  upcomingContent: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2D3748',
    marginBottom: 2,
  },
  upcomingTime: {
    fontSize: 13,
    color: '#718096',
  },
});
