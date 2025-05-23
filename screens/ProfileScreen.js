import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch, ScrollView, SafeAreaView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { ApiContext } from '../contexts/ApiContext';

export default function ProfileScreen({ navigation }) {
  const { user, logout, isAuthenticated } = useAuth();
  const { apiBaseUrl } = useContext(ApiContext);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.nome || '');
  const [email, setEmail] = useState(user?.email || '');
  
  const [editingEmergencyContact, setEditingEmergencyContact] = useState(false);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyEmail, setEmergencyEmail] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Carregar contato de emergência existente quando o componente for montado
  useEffect(() => {
    const loadEmergencyContact = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;
        
        const response = await fetch(`${apiBaseUrl}/api/users/emergency-contacts`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            const contact = data[0]; // Pega o primeiro contato (assumindo que há apenas um por enquanto)
            setEmergencyName(contact.nome);
            setEmergencyEmail(contact.email || '');
            setEmergencyPhone(contact.telefone);
            setEmergencyRelationship(contact.relacao || '');
          }
        }
      } catch (error) {
        console.error('Erro ao carregar contato de emergência:', error);
      }
    };
    
    loadEmergencyContact();
  }, [apiBaseUrl]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [emergencyAlertsEnabled, setEmergencyAlertsEnabled] = useState(true);
  
  const handleSaveProfile = () => {
    // Aqui você implementaria a lógica para salvar o perfil
    console.log('Salvando perfil:', { name, email });
    setEditing(false);
  };
  
  const handleSaveEmergencyContact = async () => {
    // Verificar se o usuário está autenticado
    if (!isAuthenticated) {
      Alert.alert('Erro', 'Você precisa estar autenticado para adicionar um contato de emergência');
      return;
    }
    
    try {
      
      // Validar campos obrigatórios
      if (!emergencyName || !emergencyPhone) {
        Alert.alert('Erro', 'Nome e telefone são obrigatórios');
        return;
      }
      
      console.log('Salvando contato de emergência para o usuário ID:', user?.id || 'não definido');
      console.log('Dados do contato:', { 
        emergencyName, 
        emergencyEmail, 
        emergencyPhone, 
        emergencyRelationship 
      });
      
      // Obter o token do AsyncStorage
      console.log('Buscando token no AsyncStorage...');
      const token = await AsyncStorage.getItem('userToken');
      console.log('Token encontrado no AsyncStorage:', token ? 'Sim' : 'Não');
      
      if (!token) {
        console.error('Token não encontrado no AsyncStorage');
        throw new Error('Token de autenticação não encontrado');
      }
      
      console.log('Token encontrado (primeiros 10 caracteres):', token.substring(0, 10) + '...');
      
      // Verificar se o usuário está autenticado
      console.log('Usuário autenticado?', isAuthenticated);
      console.log('Dados do usuário:', user);
      
      if (!user?.id) {
        console.error('ID do usuário não encontrado');
        throw new Error('ID do usuário não encontrado');
      }
      
      console.log('Preparando requisição para:', `${apiBaseUrl}/api/users/emergency-contacts`);
      
      // Preparar os cabeçalhos
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      
      console.log('Headers da requisição:', JSON.stringify(headers, null, 2));
      
      // Preparar o corpo da requisição
      const body = {
        nome: emergencyName,
        email: emergencyEmail,
        telefone: emergencyPhone,
        relacao: emergencyRelationship,
        isPrimary: true // Definir como contato primário
      };
      
      console.log('Corpo da requisição:', JSON.stringify(body, null, 2));
      
      // Fazer a chamada para a API
      console.log('Iniciando chamada fetch...');
      const response = await fetch(`${apiBaseUrl}/api/users/emergency-contacts`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });
      
      console.log('Resposta recebida. Status:', response.status);
      
      let result;
      const responseText = await response.text();
      console.log('Texto da resposta:', responseText);
      
      try {
        result = responseText ? JSON.parse(responseText) : {};
        console.log('Resposta parseada:', JSON.stringify(result, null, 2));
      } catch (e) {
        console.error('Erro ao fazer parse da resposta:', e);
        console.error('Conteúdo da resposta que falhou ao fazer parse:', responseText);
        throw new Error('Resposta inválida do servidor');
      }
      
      if (!response.ok) {
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          headers: Object.fromEntries(response.headers.entries()),
          body: result
        };
        
        console.error('Erro na resposta:', JSON.stringify(errorDetails, null, 2));
        
        // Verificar se é um erro de autenticação
        if (response.status === 401) {
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
        
        throw new Error(result.message || `Erro ao salvar contato de emergência (${response.status} ${response.statusText})`);
      }
      console.log('Contato de emergência salvo com sucesso:', result);
      
      // Atualizar o estado do perfil para refletir as alterações
      setEditingEmergencyContact(false);
      
      // Atualizar os estados locais com os dados do contato salvo
      if (result.contact) {
        setEmergencyName(result.contact.nome);
        setEmergencyEmail(result.contact.email || '');
        setEmergencyPhone(result.contact.telefone);
        setEmergencyRelationship(result.contact.relacao || '');
      }
      
      // Mostrar mensagem de sucesso
      Alert.alert(
        'Sucesso', 
        'Contato de emergência salvo com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => console.log('Alerta de sucesso fechado')
          }
        ]
      );
      
    } catch (error) {
      console.error('Erro ao salvar contato de emergência:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        response: error.response
      });
      Alert.alert(
        'Erro',
        error.message || 'Erro ao salvar contato de emergência. Tente novamente.',
        [
          { 
            text: 'OK',
            onPress: () => console.log('Alerta de erro fechado')
          }
        ]
      );
    }
  };
  
  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      navigation.replace('Welcome');
    }
  };
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfil</Text>
      </View>
      
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color="#4A90E2" />
        </View>
        
        {editing ? (
          <View style={styles.editForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Seu nome"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Seu email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setName(user?.nome || '');
                  setEmail(user?.email || '');
                  setEditing(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.nome || 'Usuário'}</Text>
            <Text style={styles.email}>{user?.email || 'usuario@exemplo.com'}</Text>
            
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditing(true)}
            >
              <Text style={styles.editButtonText}>Editar Perfil</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="people" size={20} color="#4A90E2" />
            <Text style={styles.sectionTitle}>Contato de Emergência</Text>
          </View>
          
          {!editingEmergencyContact && (
            <TouchableOpacity
              onPress={() => setEditingEmergencyContact(true)}
            >
              <Text style={styles.editText}>
                {emergencyName ? 'Editar' : 'Adicionar'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        {editingEmergencyContact ? (
          <View style={styles.editForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome</Text>
              <TextInput
                style={styles.input}
                value={emergencyName}
                onChangeText={setEmergencyName}
                placeholder="Nome do contato"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={emergencyEmail}
                onChangeText={setEmergencyEmail}
                placeholder="Email do contato"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefone</Text>
              <TextInput
                style={styles.input}
                value={emergencyPhone}
                onChangeText={setEmergencyPhone}
                placeholder="Telefone do contato"
                keyboardType="phone-pad"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Relacionamento</Text>
              <TextInput
                style={styles.input}
                value={emergencyRelationship}
                onChangeText={setEmergencyRelationship}
                placeholder="ex: Cônjuge, Pai/Mãe, Amigo"
              />
            </View>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setEditingEmergencyContact(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveEmergencyContact}
              >
                <Text style={styles.saveButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : emergencyName ? (
          <View style={styles.contactInfo}>
            <View style={styles.contactRow}>
              <Ionicons name="person" size={16} color="#718096" style={styles.contactIcon} />
              <Text style={styles.contactText}>{emergencyName}</Text>
            </View>
            
            <View style={styles.contactRow}>
              <Ionicons name="mail" size={16} color="#718096" style={styles.contactIcon} />
              <Text style={styles.contactText}>{emergencyEmail}</Text>
            </View>
            
            <View style={styles.contactRow}>
              <Ionicons name="call" size={16} color="#718096" style={styles.contactIcon} />
              <Text style={styles.contactText}>{emergencyPhone}</Text>
            </View>
            
            <View style={styles.contactRow}>
              <Ionicons name="people" size={16} color="#718096" style={styles.contactIcon} />
              <Text style={styles.contactText}>{emergencyRelationship}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.noContactContainer}>
            <Text style={styles.noContactText}>
              Adicione um contato de emergência que será notificado se você esquecer seu medicamento
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="notifications" size={20} color="#4A90E2" />
            <Text style={styles.sectionTitle}>Configurações de Notificação</Text>
          </View>
        </View>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingText}>Ativar Notificações</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#CBD5E0', true: '#4A90E2' }}
            thumbColor="#FFFFFF"
          />
        </View>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingText}>Alertas Sonoros</Text>
          <Switch
            value={soundEnabled}
            onValueChange={setSoundEnabled}
            trackColor={{ false: '#CBD5E0', true: '#4A90E2' }}
            thumbColor="#FFFFFF"
          />
        </View>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingText}>Alertas para Contato de Emergência</Text>
          <Switch
            value={emergencyAlertsEnabled}
            onValueChange={setEmergencyAlertsEnabled}
            trackColor={{ false: '#CBD5E0', true: '#4A90E2' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Ionicons name="log-out" size={18} color="#FF6B6B" />
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>
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
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EBF8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileInfo: {
    alignItems: 'center',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 16,
  },
  editButton: {
    backgroundColor: '#EBF8FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A90E2',
  },
  editForm: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A5568',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2D3748',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#EDF2F7',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#4A90E2',
    marginLeft: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A5568',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginLeft: 8,
  },
  editText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A90E2',
  },
  contactInfo: {
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    padding: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactIcon: {
    marginRight: 8,
  },
  contactText: {
    fontSize: 16,
    color: '#4A5568',
  },
  noContactContainer: {
    padding: 16,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    alignItems: 'center',
  },
  noContactText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  settingText: {
    fontSize: 16,
    color: '#2D3748',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE8EC',
    paddingVertical: 16,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 8,
  },
});
