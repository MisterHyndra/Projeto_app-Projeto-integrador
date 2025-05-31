import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useMedication } from '../contexts/MedicationContext';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [scheduledNotifications, setScheduledNotifications] = useState([]);
  const { notificationSettings, medications, savedNotifications, upcomingNotifications, checkScheduledNotifications } = useMedication();
  const { isAuthenticated, user } = { isAuthenticated: true, user: { id: 'user1' } }; // Simulando contexto de autenticação

  // Carregar notificações agendadas
  const loadScheduledNotifications = async () => {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log('Notificações agendadas encontradas:', scheduled.length);
      setScheduledNotifications(scheduled);
    } catch (error) {
      console.error('Erro ao carregar notificações agendadas:', error);
    }
  };

  // Atualizar as notificações quando o componente for montado ou quando o foco mudar
  useEffect(() => {
    setNotifications(savedNotifications || []);
    
    // Carregar notificações agendadas
    loadScheduledNotifications();
    
    // Verificar notificações agendadas quando a tela receber foco
    const unsubscribe = navigation.addListener('focus', () => {
      checkScheduledNotifications();
      loadScheduledNotifications();
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
  const clearAllNotifications = async () => {
    try {
      // Limpar notificações agendadas
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Atualizar o estado local
      setNotifications([]);
      setScheduledNotifications([]);
      
      console.log('Todas as notificações foram canceladas');
      
      // Recarregar a lista para garantir que está vazia
      loadScheduledNotifications();
    } catch (error) {
      console.error('Erro ao limpar notificações:', error);
    }
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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Notificações</Text>
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={clearAllNotifications}
            disabled={notifications.length === 0}
          >
            <Ionicons name="trash-outline" size={14} color="#718096" />
            <Text style={styles.clearButtonText}>Limpar Tudo</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView style={styles.settingsContainer}>
        <View style={[styles.card, { marginBottom: 20 }]}>
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
          {scheduledNotifications && scheduledNotifications.length > 0 ? (
            scheduledNotifications.map((notification, index) => {
              // Extrair informações da notificação
              let triggerDate;
              
              // Lidar com diferentes formatos de trigger
              if (notification.trigger && notification.trigger.date) {
                triggerDate = new Date(notification.trigger.date);
              } else if (notification.trigger && notification.trigger.seconds) {
                // Se for um timestamp em segundos
                triggerDate = new Date(notification.trigger.seconds * 1000);
              } else {
                triggerDate = new Date();
              }
              
              const now = new Date();
              
              // Formatar data e hora - Removido timeZone para usar o fuso horário local
              const timeString = triggerDate.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
              });
              
              // Verificar se é para hoje ou outro dia
              const isToday = triggerDate.getDate() === now.getDate() && 
                            triggerDate.getMonth() === now.getMonth() && 
                            triggerDate.getFullYear() === now.getFullYear();
              
              const dateString = isToday ? 'Hoje' : triggerDate.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              });
              
              // Extrair nome do medicamento
              const medicationName = notification.content?.data?.medicationName || 'Medicamento';
              
              return (
                <View key={`upcoming-${index}`} style={styles.upcomingItem}>
                  <View style={styles.upcomingTimeContainer}>
                    <Text style={styles.upcomingTime}>{timeString}</Text>
                    <Text style={styles.upcomingDate}>{dateString}</Text>
                  </View>
                  <View style={styles.upcomingContent}>
                    <Text style={styles.upcomingTitle} numberOfLines={1}>
                      {medicationName}
                    </Text>
                    <Text style={styles.upcomingBody} numberOfLines={2}>
                      {notification.content?.body || 'Lembrete de medicamento'}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyUpcomingContainer}>
              <Ionicons name="time-outline" size={40} color="#CBD5E0" />
              <Text style={styles.emptyUpcomingText}>
                Nenhum lembrete futuro agendado
              </Text>
            </View>
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
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical:5,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginLeft: 4,
  },
  clearButtonText: {
    marginLeft: 4,
    color: '#718096',
    fontSize: 14,
    fontWeight: '500',
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
  upcomingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  upcomingTimeContainer: {
    width: 70,
    alignItems: 'flex-start',
    marginRight: 12,
  },
  upcomingTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
  },
  upcomingDate: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  upcomingContent: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 2,
  },
  upcomingBody: {
    fontSize: 13,
    color: '#718096',
    lineHeight: 18,
  },
  emptyUpcomingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyUpcomingText: {
    marginTop: 12,
    color: '#A0AEC0',
    textAlign: 'center',
    fontSize: 14,
  },
});
