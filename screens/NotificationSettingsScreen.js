import React from 'react';
import { View, StyleSheet, Switch, Text } from 'react-native';
import { Slider } from '@rneui/themed';
import { useMedication } from '../contexts/MedicationContext';
import { useTheme } from '@rneui/themed';

export default function NotificationSettingsScreen() {
  const { notificationSettings, updateNotificationSettings } = useMedication();
  const { theme } = useTheme();

  const handleSoundToggle = () => {
    updateNotificationSettings({ soundEnabled: !notificationSettings.soundEnabled });
  };

  const handleVibrationToggle = () => {
    updateNotificationSettings({ vibrationEnabled: !notificationSettings.vibrationEnabled });
  };

  const handleReminderIntervalChange = (value) => {
    updateNotificationSettings({ reminderInterval: Math.round(value) });
  };

  const handleMaxRemindersChange = (value) => {
    updateNotificationSettings({ maxReminders: Math.round(value) });
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alertas</Text>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Som</Text>
          <Switch
            value={notificationSettings.soundEnabled}
            onValueChange={handleSoundToggle}
            trackColor={{ false: '#767577', true: theme.colors.primary }}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Vibração</Text>
          <Switch
            value={notificationSettings.vibrationEnabled}
            onValueChange={handleVibrationToggle}
            trackColor={{ false: '#767577', true: theme.colors.primary }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lembretes</Text>
        
        <Text style={styles.settingLabel}>
          Intervalo entre lembretes: {notificationSettings.reminderInterval} minutos
        </Text>
        <Slider
          value={notificationSettings.reminderInterval}
          onValueChange={handleReminderIntervalChange}
          minimumValue={1}
          maximumValue={30}
          step={1}
          trackStyle={{ height: 5 }}
          thumbStyle={{ height: 20, width: 20 }}
          thumbTintColor={theme.colors.primary}
          minimumTrackTintColor={theme.colors.primary}
          style={styles.slider}
        />

        <Text style={styles.settingLabel}>
          Número máximo de lembretes: {notificationSettings.maxReminders}
        </Text>
        <Slider
          value={notificationSettings.maxReminders}
          onValueChange={handleMaxRemindersChange}
          minimumValue={1}
          maximumValue={5}
          step={1}
          trackStyle={{ height: 5 }}
          thumbStyle={{ height: 20, width: 20 }}
          thumbTintColor={theme.colors.primary}
          minimumTrackTintColor={theme.colors.primary}
          style={styles.slider}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  slider: {
    marginBottom: 24,
  },
});
