import { View, Text, Image, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useTheme } from '@/lib/theme';
import { LINKS, openLink } from '@/lib/links';
import AppHeader from '@/components/AppHeader';
import { ListCard, ListRow } from '@/components/SettingsList';

const PLATFORM_NAME: Record<string, string> = { android: 'Android', ios: 'iOS', web: 'Web' };

export default function AboutScreen() {
  const colors = useTheme();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: colors.bg }]}>
      <AppHeader title="About" leading="back" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Image source={require('../../assets/icon.png')} style={styles.icon} accessibilityLabel="Purrfolio app icon" />
          <Text style={[styles.appName, { color: colors.heading }]}>Purrfolio</Text>
          <Text style={[styles.version, { color: colors.muted }]}>
            Version {Constants.expoConfig?.version ?? '–'} · {PLATFORM_NAME[Platform.OS] ?? Platform.OS}
          </Text>
        </View>

        <View style={[styles.story, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.storyTitle, { color: colors.text }]}>The story</Text>
          <Text style={[styles.storyBody, { color: colors.muted }]}>
            Purrfolio helps you keep track of what you spend and see what's coming.
          </Text>
        </View>

        <ListCard>
          <ListRow
            icon="globe-outline"
            label="Web app"
            caption="my.purrfolio.app – also on the web"
            onPress={() => openLink(LINKS.webApp)}
            trailing="external"
          />
        </ListCard>

        <Text style={[styles.footer, { color: colors.muted }]}>
          © {new Date().getFullYear()} Purrfolio{'\n'}Made in Hungary
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingHorizontal: 16, paddingBottom: 24, gap: 20 },
  hero: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  icon: { width: 88, height: 88, borderRadius: 26 },
  appName: { fontSize: 24, fontFamily: 'Lora_700Bold', letterSpacing: -0.4 },
  version: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  story: { borderRadius: 18, borderWidth: 1, padding: 20, gap: 8 },
  storyTitle: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
  storyBody: { fontSize: 15, fontFamily: 'Nunito_400Regular', lineHeight: 22 },
  footer: { textAlign: 'center', fontSize: 12, fontFamily: 'Nunito_400Regular', lineHeight: 20 },
});
