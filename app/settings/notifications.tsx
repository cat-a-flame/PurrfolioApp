import React, { useState, useCallback } from 'react';
import { View, Text, Switch, StyleSheet, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/lib/theme';
import AppHeader from '@/components/AppHeader';
import {
  isAutoPaymentNotificationEnabled,
  isDailyReminderEnabled,
  setAutoPaymentNotificationEnabled,
  setDailyReminderEnabled,
  requestNotificationPermission,
} from '@/lib/notifications';

export default function NotificationsScreen() {
  const colors = useTheme();
  const [autoPayments, setAutoPayments] = useState(false);
  const [dailyReminder, setDailyReminder] = useState(false);

  useFocusEffect(useCallback(() => {
    Promise.all([isAutoPaymentNotificationEnabled(), isDailyReminderEnabled()]).then(([a, d]) => {
      setAutoPayments(a);
      setDailyReminder(d);
    });
  }, []));

  // Turning a switch on needs the system notification permission first.
  async function toggle(
    value: boolean,
    save: (enabled: boolean) => Promise<void>,
    setState: (enabled: boolean) => void,
  ) {
    if (value && !(await requestNotificationPermission())) {
      Alert.alert(
        'Notifications are off',
        'Allow notifications for Purrfolio in your device settings to turn this on.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    setState(value);
    await save(value);
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.bg }]}>
      <AppHeader title="Notifications" leading="back" />
      <View style={styles.container}>
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Planned payments</Text>
              <Text style={[styles.rowHint, { color: colors.muted }]}>
                Let me know when a planned payment is added automatically
              </Text>
            </View>
            <Switch
              value={autoPayments}
              onValueChange={v => toggle(v, setAutoPaymentNotificationEnabled, setAutoPayments)}
              trackColor={{ true: colors.accent }}
              thumbColor="#fff"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Daily reminder</Text>
              <Text style={[styles.rowHint, { color: colors.muted }]}>
                Remind me every day at 8:00 PM to log my expenses
              </Text>
            </View>
            <Switch
              value={dailyReminder}
              onValueChange={v => toggle(v, setDailyReminderEnabled, setDailyReminder)}
              trackColor={{ true: colors.accent }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingHorizontal: 16, paddingTop: 24 },
  group: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rowLabel: { fontFamily: 'Nunito_400Regular', fontSize: 15 },
  rowHint: { fontFamily: 'Nunito_400Regular', fontSize: 12, marginTop: 2 },
  divider: { height: 1, marginHorizontal: 16 },
});
