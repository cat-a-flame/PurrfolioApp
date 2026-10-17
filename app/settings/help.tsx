import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/theme';
import { LINKS, openLink } from '@/lib/links';
import AppHeader from '@/components/AppHeader';
import { ListCard, ListRow, SectionLabel } from '@/components/SettingsList';

export default function HelpScreen() {
  const colors = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.bg }]}>
      <AppHeader title="Help & about" showBack />
      <ScrollView contentContainerStyle={styles.container}>
        <View>
          <SectionLabel>Support</SectionLabel>
          <ListCard>
            <ListRow
              icon="chatbox-ellipses-outline"
              label="Feedback"
              caption="Report a bug or get in touch"
              onPress={() => router.push('/settings/feedback')}
            />
            <ListRow
              icon="people-outline"
              label="Join the community"
              onPress={() => openLink(LINKS.community)}
              trailing="external"
            />
          </ListCard>
        </View>

        <View>
          <SectionLabel>Legal</SectionLabel>
          <ListCard>
            <ListRow icon="document-text-outline" label="Terms of Service" onPress={() => openLink(LINKS.terms)} trailing="external" />
            <ListRow icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => openLink(LINKS.privacy)} trailing="external" />
          </ListCard>
        </View>

        <View>
          <SectionLabel>About</SectionLabel>
          <ListCard>
            <ListRow icon="information-circle-outline" label="About Purrfolio" onPress={() => router.push('/settings/about')} />
          </ListCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingHorizontal: 16, paddingBottom: 40, gap: 20 },
});
