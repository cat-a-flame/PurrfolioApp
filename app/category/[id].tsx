import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme, radius } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';
import ConfirmModal from '@/components/ConfirmModal';
import type { TransactionType } from '@/lib/types';
import { firstEmoji } from '@/lib/utils';

type CatType = TransactionType | 'both';

type SubDraft = { id?: string; _key: string; icon: string; name: string };

type CatForm = {
  name: string;
  icon: string;
  color: string;
  type: CatType;
  subs: SubDraft[];
};

const TYPES: { value: CatType; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'both', label: 'Both' },
];

const TYPE_ICONS: Record<CatType, keyof typeof Ionicons.glyphMap> = {
  expense: 'trending-down',
  income: 'trending-up',
  both: 'swap-vertical',
};

const CATEGORY_COLORS = [
  '#6C63FF', '#FF6B6B', '#43BCCD', '#F9A826', '#5CB85C',
  '#E8468A', '#3ABFB1', '#FF8C42', '#9B59B6', '#2ECC71',
  '#E74C3C', '#3498DB',
];

function typeColor(t: CatType, colors: any): string {
  if (t === 'income') return colors.income;
  if (t === 'expense') return colors.expense;
  return colors.accent;
}

let subKeySeq = 0;
function nextSubKey() { return `new-${++subKeySeq}`; }

export default function CategoryScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const [form, setForm] = useState<CatForm>({
    name: '', icon: '🙂', color: CATEGORY_COLORS[0], type: 'both', subs: [],
  });
  const [isDefault, setIsDefault] = useState(false);
  const [fetching, setFetching] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isNew) return;
    async function load() {
      const [{ data: category }, { data: children }] = await Promise.all([
        supabase.from('categories').select('*').eq('id', id).single(),
        supabase.from('categories').select('*').eq('parent_id', id).order('name'),
      ]);
      if (category) {
        setForm({
          name: category.name,
          icon: category.icon,
          color: category.color || CATEGORY_COLORS[0],
          type: category.type,
          subs: (children ?? []).map((c: any) => ({ id: c.id, _key: c.id, icon: c.icon, name: c.name })),
        });
        setIsDefault(category.is_default);
      }
      setFetching(false);
    }
    load();
  }, [id]);

  function setField<K extends keyof CatForm>(key: K, value: CatForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function patchSub(key: string, patch: Partial<SubDraft>) {
    setForm((f) => ({ ...f, subs: f.subs.map((s) => (s._key === key ? { ...s, ...patch } : s)) }));
  }

  function removeSub(key: string) {
    setForm((f) => ({ ...f, subs: f.subs.filter((s) => s._key !== key) }));
  }

  function addSub() {
    setForm((f) => ({ ...f, subs: [...f.subs, { _key: nextSubKey(), icon: '🏷️', name: '' }] }));
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const name = form.name.trim();
    const icon = form.icon.trim() || '📁';
    const subs = form.subs.filter((s) => s.name.trim());

    if (isNew) {
      const { data: created, error } = await supabase.from('categories')
        .insert({ user_id: user.id, name, type: form.type, icon, color: form.color, is_default: false, parent_id: null })
        .select('id').single();

      if (error || !created) { setSaving(false); return; }

      if (subs.length) {
        await supabase.from('categories').insert(subs.map((s) => ({
          user_id: user.id, name: s.name.trim(), type: form.type, icon: s.icon.trim() || '📁',
          color: form.color, is_default: false, parent_id: created.id,
        })));
      }

      setSaving(false);
      router.back();
      return;
    }

    const { error } = await supabase.from('categories')
      .update({ name, icon, color: form.color, type: form.type })
      .eq('id', id);

    if (error) { setSaving(false); return; }

    const keptIds = new Set(subs.filter((s) => s.id).map((s) => s.id as string));
    const { data: existingChildren } = await supabase.from('categories').select('id').eq('parent_id', id);
    const removedIds = (existingChildren ?? []).map((c) => c.id).filter((cid) => !keptIds.has(cid));
    const toUpdate = subs.filter((s) => s.id);
    const toInsert = subs.filter((s) => !s.id);

    await Promise.all([
      ...toUpdate.map((s) => supabase.from('categories')
        .update({ name: s.name.trim(), icon: s.icon.trim() || '📁', color: form.color, type: form.type })
        .eq('id', s.id as string)),
      ...(toInsert.length ? [supabase.from('categories').insert(toInsert.map((s) => ({
        user_id: user.id, name: s.name.trim(), type: form.type, icon: s.icon.trim() || '📁',
        color: form.color, is_default: false, parent_id: id,
      })))] : []),
      ...(removedIds.length ? [supabase.from('categories').delete().in('id', removedIds)] : []),
    ]);

    setSaving(false);
    router.back();
  }

  async function handleDelete() {
    await supabase.from('categories').delete().eq('parent_id', id);
    await supabase.from('categories').delete().eq('id', id);
    router.back();
  }

  if (fetching) {
    return <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.bg }]} />;
  }

  const subCount = form.subs.length;
  const typeLabel = TYPES.find((t) => t.value === form.type)?.label ?? '';

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.heading }]}>
          {isNew ? 'Add category' : 'Edit category'}
        </Text>
        {!isNew && !isDefault ? (
          <TouchableOpacity onPress={() => setConfirmDelete(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom + 32 }]} keyboardShouldPersistTaps="handled">
          {/* Icon, name and summary */}
          <View style={[styles.card, { backgroundColor: colors.glassStrong, borderColor: colors.glassBorder, shadowColor: colors.shadow }]}>
            <View style={styles.iconNameRow}>
              <View style={styles.iconCol}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Icon</Text>
                <TextInput
                  value={form.icon}
                  onChangeText={(v) => setField('icon', firstEmoji(v))}
                  placeholder="🙂"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.iconTile, { backgroundColor: form.color + '22', borderColor: form.color }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Category name</Text>
                <AppInput
                  value={form.name}
                  onChangeText={(v) => setField('name', v)}
                  placeholder="e.g. Food & Dining"
                  style={{ height: 64 }}
                />
              </View>
            </View>
            <View style={[styles.summary, { borderTopColor: colors.border2 }]}>
              <View style={[styles.summaryDot, { backgroundColor: form.color }]} />
              <Text style={[styles.summaryText, { color: colors.muted }]}>
                {typeLabel} · {subCount} {subCount === 1 ? 'subcategory' : 'subcategories'}
              </Text>
            </View>
          </View>

          {/* Type */}
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>Type</Text>
          <View style={[styles.typeToggle, { backgroundColor: colors.surface }]}>
            {TYPES.map((t) => {
              const active = form.type === t.value;
              const tint = active ? '#fff' : colors.muted;
              return (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.typeBtn, active && { backgroundColor: typeColor(t.value, colors) }]}
                  onPress={() => setField('type', t.value)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={TYPE_ICONS[t.value]} size={16} color={tint} />
                  <Text style={[styles.typeBtnText, { color: tint }]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Color */}
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>Color</Text>
          <View style={[styles.card, styles.colorCard, { backgroundColor: colors.glassStrong, borderColor: colors.glassBorder, shadowColor: colors.shadow }]}>
            {CATEGORY_COLORS.map((c) => {
              const selected = form.color.toLowerCase() === c.toLowerCase();
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setField('color', c)}
                  activeOpacity={0.8}
                  style={[styles.swatchWrap, selected && { borderColor: c }]}
                >
                  <View style={[styles.swatch, { backgroundColor: c }]}>
                    {selected && <Ionicons name="checkmark" size={18} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Subcategories */}
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>Subcategories</Text>
            <Text style={[styles.sectionCount, { color: colors.muted }]}>{subCount}</Text>
          </View>
          <View style={[styles.card, styles.subsCard, { backgroundColor: colors.glassStrong, borderColor: colors.glassBorder, shadowColor: colors.shadow }]}>
            {form.subs.map((sub) => (
              <View key={sub._key} style={[styles.subRow, { borderBottomColor: colors.border2 }]}>
                <TextInput
                  value={sub.icon}
                  onChangeText={(v) => patchSub(sub._key, { icon: firstEmoji(v) })}
                  style={[styles.subIcon, { backgroundColor: form.color + '22' }]}
                />
                <TextInput
                  value={sub.name}
                  onChangeText={(v) => patchSub(sub._key, { name: v })}
                  placeholder="Subcategory name"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.subName, { color: colors.text }]}
                />
                <TouchableOpacity onPress={() => removeSub(sub._key)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={18} color={colors.muted} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={[styles.addSubBtn, { backgroundColor: colors.surface2 }]} onPress={addSub} activeOpacity={0.7}>
              <Ionicons name="add" size={20} color={colors.accent} />
              <Text style={[styles.addSubText, { color: colors.accent }]}>Add subcategory</Text>
            </TouchableOpacity>
          </View>
          <AppButton onPress={handleSave} loading={saving} fullWidth style={{ marginTop: 8 }}>
            {isNew ? 'Add category' : 'Save changes'}
          </AppButton>
        </ScrollView>

      </KeyboardAvoidingView>

      <ConfirmModal
        visible={confirmDelete}
        title="Delete category"
        message={`Delete "${form.name}"? This category and its subcategories will be removed. Existing transactions will become uncategorized.`}
        confirmLabel="Delete"
        onConfirm={() => { setConfirmDelete(false); handleDelete(); }}
        onCancel={() => setConfirmDelete(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontFamily: 'Lora_700Bold' },
  content: { padding: 16, paddingBottom: 24, gap: 10 },
  card: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: 16,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 3,
  },
  iconNameRow: { flexDirection: 'row', gap: 12 },
  iconCol: { alignItems: 'center' },
  fieldLabel: { fontSize: 13, fontFamily: 'Nunito_700Bold', marginBottom: 6 },
  iconTile: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    textAlign: 'center',
    fontSize: 28,
    fontFamily: 'Nunito_400Regular',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  summaryDot: { width: 10, height: 10, borderRadius: 5 },
  summaryText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  sectionLabel: {
    marginTop: 14,
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionCount: { fontSize: 11, fontFamily: 'Nunito_700Bold' },
  typeToggle: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden', padding: 4, gap: 4 },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  typeBtnText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  colorCard: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8, paddingVertical: 14 },
  swatchWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  subsCard: { padding: 0, overflow: 'hidden' },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  subIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    textAlign: 'center',
    fontSize: 20,
    fontFamily: 'Nunito_400Regular',
    padding: 0,
  },
  subName: { flex: 1, fontSize: 16, fontFamily: 'Nunito_600SemiBold', paddingVertical: 8 },
  addSubBtn: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
  },
  addSubText: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
});
