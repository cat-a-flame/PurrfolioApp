import { Fragment } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme';
import AppHeader from '@/components/AppHeader';

const ITEMS = [
  { label: 'Security', route: '/settings/security' },
  { label: 'Notifications', route: '/settings/notifications' },
  { label: 'Export data', route: '/settings/export' },
];

export default function SettingsMenuScreen() {
  const colors = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.bg }]}>
      <AppHeader title="Settings" leading="back" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {ITEMS.map((item, idx) => (
            <Fragment key={item.label}>
              {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <TouchableOpacity
                style={styles.row}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <Text style={[styles.rowLabel, { color: colors.text }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </TouchableOpacity>
            </Fragment>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 },
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
  divider: { height: 1, marginHorizontal: 16 },
});
