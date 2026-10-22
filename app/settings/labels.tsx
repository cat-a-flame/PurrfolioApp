import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import AppHeader, { HeaderIconButton } from '@/components/AppHeader';
import { Ionicons } from '@expo/vector-icons';
import type { Label } from '@/lib/types';

export default function LabelsScreen() {
  const colors = useTheme();
  const router = useRouter();
  const [labels, setLabels] = useState<Label[]>([]);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('labels').select('*').eq('user_id', user.id).order('name');
    setLabels(data ?? []);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const q = search.trim().toLowerCase();
  const filtered = q ? labels.filter(l => l.name.toLowerCase().includes(q)) : labels;

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.bg }]}>
      <AppHeader
        title="Labels"
        leading="back"
        rightAction={<HeaderIconButton icon="add" tone="accent" label="Add label" onPress={() => router.push('/label/new')} />}
      />

      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search labels…"
            placeholderTextColor={colors.placeholder}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push(`/label/${item.id}`)}
            activeOpacity={0.7}
          >
            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
            <Text style={[styles.rowName, { color: colors.text }]}>{item.name}</Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.muted }]}>No labels yet.</Text>}
        ListFooterComponent={<View style={{ height: 32 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  searchInput: { flex: 1, fontFamily: 'Nunito_400Regular', fontSize: 15, padding: 0 },
  list: { padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  colorDot: { width: 16, height: 16, borderRadius: 8 },
  rowName: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  empty: { textAlign: 'center', marginTop: 32, fontFamily: 'Nunito_400Regular', fontSize: 15 },
});
