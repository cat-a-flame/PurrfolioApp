import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';
import AppHeader, { HeaderIconButton } from '@/components/AppHeader';
import ConfirmModal from '@/components/ConfirmModal';

const LABEL_COLORS = [
  '#6C63FF', '#FF6B6B', '#43BCCD', '#F9A826', '#5CB85C',
  '#E8468A', '#3ABFB1', '#FF8C42', '#9B59B6', '#2ECC71',
  '#E74C3C', '#3498DB',
];

export default function LabelScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const [name, setName] = useState('');
  const [color, setColor] = useState(LABEL_COLORS[0]);
  const [fetching, setFetching] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isNew) return;
    async function load() {
      const { data } = await supabase.from('labels').select('*').eq('id', id).single();
      if (data) {
        setName(data.name);
        setColor(data.color || LABEL_COLORS[0]);
      }
      setFetching(false);
    }
    load();
  }, [id]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    if (isNew) {
      await supabase.from('labels').insert({ name: name.trim(), color, user_id: user.id });
    } else {
      await supabase.from('labels').update({ name: name.trim(), color }).eq('id', id);
    }

    setSaving(false);
    router.back();
  }

  async function handleDelete() {
    await supabase.from('labels').delete().eq('id', id);
    router.back();
  }

  if (fetching) {
    return <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.bg }]} />;
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.bg }]}>
      <AppHeader
        title={isNew ? 'New label' : 'Edit label'}
        leading="close"
        rightAction={
          !isNew ? (
            <HeaderIconButton icon="trash-outline" tone="danger" label="Delete label" onPress={() => setConfirmDelete(true)} />
          ) : undefined
        }
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <AppInput label="Name" value={name} onChangeText={setName} placeholder="Label name" />

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Color</Text>
            <View style={styles.colorRow}>
              {LABEL_COLORS.map((c) => {
                const selected = color.toLowerCase() === c.toLowerCase();
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setColor(c)}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: c },
                      selected && [styles.colorSwatchSelected, { borderColor: colors.text }],
                    ]}
                  />
                );
              })}
            </View>
          </View>

        </ScrollView>
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: bottom + 12 }]}>
          <AppButton onPress={handleSave} loading={saving} fullWidth>
            {isNew ? 'Add label' : 'Save changes'}
          </AppButton>
        </View>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={confirmDelete}
        title="Delete label"
        message={`Delete "${name}"?`}
        confirmLabel="Delete"
        onConfirm={() => { setConfirmDelete(false); handleDelete(); }}
        onCancel={() => setConfirmDelete(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  content: { padding: 16, gap: 16 },
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorSwatch: { width: 32, height: 32, borderRadius: 16 },
  colorSwatchSelected: { borderWidth: 3 },
});
