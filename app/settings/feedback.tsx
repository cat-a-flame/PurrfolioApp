import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/lib/profile';
import AppHeader from '@/components/AppHeader';
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';
import { KeyboardAwareScroll } from '@/components/KeyboardAwareScroll';

const MAX_LENGTH = 4000;

const TOPICS = [
  { id: 'bug', label: 'Something broke', hint: 'What happened, and what did you expect?' },
  { id: 'idea', label: 'Feature idea', hint: 'What would make Purrfolio better for you?' },
  { id: 'question', label: 'Question', hint: 'What would you like to know?' },
  { id: 'other', label: 'Other', hint: 'Tell us anything…' },
] as const;

/** Sends feedback to Discord via report_bug(), same as the web. */
export default function FeedbackScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { email } = useProfile();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>(TOPICS[0]);
  const [message, setMessage] = useState('');
  const [canContact, setCanContact] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSend() {
    const text = message.trim();
    if (!text) {
      setError('Please write a message first.');
      return;
    }
    setSending(true);
    setError('');
    // report_bug has no topic or version column yet, so they ride along in the existing text fields.
    const { error: sendError } = await supabase.rpc('report_bug', {
      message: `[${topic.label}] ${text}`,
      page: from || 'feedback',
      user_agent: `PurrfolioApp ${Constants.expoConfig?.version ?? '?'} (${Platform.OS} ${Platform.Version})`,
      can_contact: canContact,
    });
    setSending(false);
    if (sendError) {
      setError(sendError.message);
      return;
    }
    Alert.alert('Thanks!', 'Your message was sent.');
    router.back();
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.bg }]}>
      <AppHeader title="Feedback" showBack />
      <KeyboardAwareScroll contentContainerStyle={styles.container}>
        <Text style={[styles.intro, { color: colors.muted }]}>
          Found a bug, have an idea or a question? Every message is read during the beta.
        </Text>

        <View style={styles.group}>
          <Text style={[styles.label, { color: colors.text }]}>What's it about?</Text>
          <View style={styles.chips}>
            {TOPICS.map((t) => {
              const on = t.id === topic.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setTopic(t)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[
                    styles.chip,
                    { borderColor: on ? colors.accent : colors.border, backgroundColor: on ? colors.accentLight : colors.surface },
                  ]}
                >
                  <Text style={[styles.chipText, { color: on ? colors.accent : colors.text }]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <AppInput
          label="Message"
          value={message}
          onChangeText={setMessage}
          placeholder={topic.hint}
          multiline
          maxLength={MAX_LENGTH}
          editable={!sending}
          style={styles.textarea}
          textAlignVertical="top"
          error={error || undefined}
        />

        <View style={[styles.switchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.switchTitle, { color: colors.text }]}>You can contact me</Text>
            <Text style={[styles.hint, { color: colors.muted }]}>
              For follow-up questions{email ? `, at ${email}` : ''}
            </Text>
          </View>
          <Switch
            value={canContact}
            onValueChange={setCanContact}
            disabled={sending}
            accessibilityLabel="You can contact me"
            trackColor={{ false: colors.border, true: colors.accent + '88' }}
            thumbColor={canContact ? colors.accent : '#f4f4f4'}
          />
        </View>

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
          <Text style={[styles.hint, { color: colors.muted, flex: 1 }]}>
            Your app version, device info and the screen you came from are attached automatically to help us fix issues faster.
          </Text>
        </View>

        <AppButton onPress={handleSend} loading={sending} fullWidth>Send</AppButton>
      </KeyboardAwareScroll>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingHorizontal: 16, paddingBottom: 40, gap: 18 },
  intro: { fontSize: 14, fontFamily: 'Nunito_400Regular', lineHeight: 21, paddingHorizontal: 4 },
  group: { gap: 8 },
  label: { fontSize: 13, fontFamily: 'Nunito_700Bold', paddingHorizontal: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, justifyContent: 'center' },
  chipText: { fontSize: 14, fontFamily: 'Nunito_700Bold' },
  textarea: { minHeight: 160, paddingTop: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, borderWidth: 1, padding: 16 },
  switchTitle: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  hint: { fontSize: 12, fontFamily: 'Nunito_400Regular', lineHeight: 17 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: 4 },
});
