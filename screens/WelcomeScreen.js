import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Clock } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function WelcomeScreen({ navigation }) {
  const { isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) {
      // Por enquanto, não vamos redirecionar
      console.log('Usuário autenticado');
    }
  }, [isAuthenticated]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4A90E2', '#50C878']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      />

      <View style={styles.header}>
        <Bell size={64} color="#fff" />
        <Text style={styles.title}>Med Alerta</Text>
        <Text style={styles.subtitle}>Nunca mais esqueça seus medicamentos</Text>
      </View>

      <View style={styles.features}>
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Bell color="#4A90E2" size={32} />
          </View>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Lembretes Inteligentes</Text>
            <Text style={styles.featureDescription}>
              Receba notificações exatamente quando precisar tomar seu medicamento
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Clock color="#50C878" size={32} />
          </View>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Acompanhamento</Text>
            <Text style={styles.featureDescription}>
              Monitore seu cronograma de medicamentos com histórico e estatísticas detalhadas
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <View style={[styles.featureIcon, { backgroundColor: '#FFE8EC' }]}>
            <Bell color="#FF6B6B" size={32} />
          </View>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Alertas de Emergência</Text>
            <Text style={styles.featureDescription}>
              Seus contatos de confiança serão notificados se você esquecer uma dose
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => {
            console.log('Criar Conta');
            navigation.navigate('Register');
          }}
        >
          <Text style={styles.primaryButtonText}>Criar Conta</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => {
            console.log('Login');
            navigation.navigate('Login');
          }}
        >
          <Text style={styles.secondaryButtonText}>Já tem uma conta? Entrar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  headerGradient: {
    height: 250,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    alignItems: 'center',
    padding: 40,
    paddingTop: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    textAlign: 'center',
  },
  features: {
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 30,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E9F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
  },
  actions: {
    padding: 24,
  },
  primaryButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4A5568',
    fontWeight: '500',
    fontSize: 14,
  },
});
