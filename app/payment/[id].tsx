import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';
import AppHeader, { HeaderIconButton } from '@/components/AppHeader';
import NumPad from '@/components/NumPad';
import BottomModal from '@/components/BottomModal';
import DatePickerModal from '@/components/DatePickerModal';
import CategoryPickerModal from '@/components/CategoryPickerModal';
import ConfirmModal from '@/components/ConfirmModal';
import { Ionicons } from '@expo/vector-icons';
import type { Wallet, Category, Label, RecurrenceFrequency } from '@/lib/types';
import { frequencyLabel, generateDueDates, isoDate } from '@/lib/recurringUtils';
import { Events } from '@/lib/events';
import FieldError from '@/components/FieldError';
import { useFieldErrors } from '@/lib/useFieldErrors';

function formatAmountDisplay(raw: string): string {
  if (!raw) return '';
  const [intPart, decPart] = raw.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return decPart !== undefined ? `${grouped}.${decPart}` : grouped;
}

const FREQUENCIES: RecurrenceFrequency[] = ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'];

type EditForm = {
  name: string;
  type: 'income' | 'expense';
  amount: string;
  wallet_id: string;
  category_id: string;
  frequency: RecurrenceFrequency;
  start_date: string;
  end_date: string;
  payer: string;
  notes: string;
  auto_add: boolean;
  labelIds: string[];
};

const EMPTY_FORM: EditForm = {
  name: '', type: 'expense', amount: '', wallet_id: '', category_id: '',
  frequency: 'monthly', start_date: isoDate(new Date()), end_date: '', payer: '', notes: '',
  auto_add: false, labelIds: [],
};

export default function EditPaymentScreen() {
  const colors = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { bottom } = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [form, setForm] = useState<EditForm>(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState<EditForm | null>(null);
  const [formError, setFormError] = useState('');
  const [errors, setErrors] = useFieldErrors({
    name: form.name,
    amount: form.amount,
    category: form.category_id,
  });
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [moreExpanded, setMoreExpanded] = useState(false);
  const [showDotMenu, setShowDotMenu] = useState(false);
  const [confirmKind, setConfirmKind] = useState<'delete' | 'pause' | null>(null);

  const isDirty = initialForm !== null && JSON.stringify(form) !== JSON.stringify(initialForm);
  const [pendingAction, setPendingAction] = useState<any>(null);
  const isSaved = useRef(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!isDirty || isSaved.current) return;
      e.preventDefault();
      setPendingAction(e.data.action);
    });
    return unsubscribe;
  }, [navigation, isDirty]);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: w }, { data: c }, { data: l }, { data: p }] = await Promise.all([
        supabase.from('wallets').select('*').eq('user_id', user.id).neq('is_archived', true).order('is_default', { ascending: false }),
        supabase.from('categories').select('*').eq('user_id', user.id).order('name'),
        supabase.from('labels').select('*').eq('user_id', user.id).order('name'),
        supabase.from('recurring_payments').select('*').eq('id', id).single(),
      ]);

      setWallets(w ?? []);
      setCategories(c ?? []);
      setLabels(l ?? []);

      if (p) {
        setIsActive(p.is_active);
        const loaded: EditForm = {
          name: p.name, type: p.type, amount: String(p.amount),
          wallet_id: p.wallet_id ?? '', category_id: p.category_id ?? '',
          frequency: p.frequency, start_date: p.start_date,
          end_date: p.end_date ?? '', payer: p.payer ?? '', notes: p.notes ?? '', auto_add: p.auto_add ?? false,
          labelIds: [],
        };
        setForm(loaded);
        setInitialForm(loaded);
      }

      setFetching(false);
    }
    loadData();
  }, [id]);

  function setField<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleNumPadKey(key: string) {
    setForm((f) => {
      const current = f.amount;
      let next: string;
      if (key === 'backspace') {
        next = current.slice(0, -1);
      } else if (key === '.') {
        if (current.includes('.')) return f;
        next = current === '' ? '0.' : current + '.';
      } else if (current === '0') {
        next = key;
      } else if (current.includes('.') && current.split('.')[1].length >= 2) {
        return f;
      } else {
        next = current + key;
      }
      return { ...f, amount: next };
    });
  }

  function toggleLabel(lid: string) {
    setForm((f) => ({
      ...f,
      labelIds: f.labelIds.includes(lid)
        ? f.labelIds.filter((x) => x !== lid)
        : [...f.labelIds, lid],
    }));
  }

  async function handleSave() {
    const found: typeof errors = {};
    if (!form.name.trim()) found.name = 'Name is required.';
    if (!form.amount || isNaN(Number(form.amount))) found.amount = 'Enter a valid amount.';
    if (!form.category_id) found.category = 'Please select a category.';
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setSaving(true);
    setFormError('');
    setErrors({});

    const { error } = await supabase
      .from('recurring_payments')
      .update({
        name: form.name.trim(),
        type: form.type,
        amount: parseFloat(form.amount),
        wallet_id: form.wallet_id || null,
        category_id: form.category_id || null,
        frequency: form.frequency,
        start_date: form.start_date,
        end_date: form.end_date || null,
        payer: form.payer.trim() || null,
        notes: form.notes || null,
        auto_add: form.auto_add,
      })
      .eq('id', id);

    setSaving(false);
    if (error) { setFormError(error.message); return; }

    Events.emit('recurring-saved', { success: true, message: 'Recurring payment updated.' });
    isSaved.current = true;
    router.back();
  }

  function handleDelete() {
    setConfirmKind(null);
    setShowDotMenu(false);
    (async () => {
      const { error } = await supabase.from('recurring_payments').delete().eq('id', id);
      Events.emit('recurring-saved', {
        success: !error,
        message: error ? (error.message ?? 'Failed to delete.') : 'Recurring payment deleted.',
      });
      isSaved.current = true;
      router.back();
    })();
  }

  function handleToggleActive() {
    setConfirmKind(null);
    setShowDotMenu(false);
    (async () => {
      const next = !isActive;

      if (!next) {
        const { error } = await supabase.from('recurring_payments').update({ is_active: false }).eq('id', id);
        Events.emit('recurring-saved', {
          success: !error,
          message: error ? (error.message ?? 'Failed to update.') : 'Paused.',
        });
        isSaved.current = true;
        router.back();
        return;
      }

      // Resuming: while paused, no due dates were generated, but generateDueDates has no
      // memory of that — it just walks forward from start_date. Auto-skip any date that
      // fell inside the paused window so it doesn't reappear as a due occurrence.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const todayIso = isoDate(new Date());
      const pastDueDates = generateDueDates(
        { start_date: form.start_date, end_date: form.end_date || null, frequency: form.frequency, is_active: true },
        new Date(form.start_date + 'T00:00:00'),
        new Date()
      ).filter((d) => isoDate(d) <= todayIso);

      let skippedCount = 0;
      if (pastDueDates.length > 0) {
        const { data: existing } = await supabase
          .from('recurring_occurrences')
          .select('due_date')
          .eq('recurring_payment_id', id);
        const actioned = new Set((existing ?? []).map((o: any) => o.due_date.slice(0, 10)));
        const toSkip = pastDueDates.filter((d) => !actioned.has(isoDate(d)));

        if (toSkip.length > 0) {
          const { error: skipError } = await supabase.from('recurring_occurrences').insert(
            toSkip.map((d) => ({
              recurring_payment_id: id,
              user_id: user.id,
              due_date: isoDate(d),
              status: 'skipped' as const,
              transaction_id: null,
            }))
          );
          if (!skipError) skippedCount = toSkip.length;
        }
      }

      const { error } = await supabase.from('recurring_payments').update({ is_active: true }).eq('id', id);
      Events.emit('recurring-saved', {
        success: !error,
        message: error
          ? (error.message ?? 'Failed to update.')
          : skippedCount > 0
          ? `Resumed — ${skippedCount} missed occurrence${skippedCount === 1 ? '' : 's'} skipped.`
          : 'Resumed.',
      });
      isSaved.current = true;
      router.back();
    })();
  }

  const selectedWallet = wallets.find((w) => w.id === form.wallet_id);
  const selectedCategory = categories.find((c) => c.id === form.category_id);
  const selectedLabels = labels.filter((l) => form.labelIds.includes(l.id));
  const currency = selectedWallet?.currency ?? '';
  const filteredCategories = categories.filter((c) => c.type === 'both' || c.type === form.type);

  if (fetching) {
    return (
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.bg }]}>
        <ActivityIndicator style={{ flex: 1 }} color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.bg }]}>
      <AppHeader
        title="Edit planned payment"
        leading="close"
        rightAction={
          <View>
            <HeaderIconButton icon="ellipsis-vertical" label="More actions" onPress={() => setShowDotMenu((v) => !v)} />
            {showDotMenu && (
              <View style={[styles.dotMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.dotMenuItem, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                  onPress={() => setConfirmKind('pause')}
                >
                  <Ionicons name={isActive ? 'pause-outline' : 'play-outline'} size={18} color={colors.text} />
                  <Text style={[styles.dotMenuText, { color: colors.text }]}>
                    {isActive ? 'Pause' : 'Resume'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dotMenuItem}
                  onPress={() => setConfirmKind('delete')}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  <Text style={[styles.dotMenuText, { color: colors.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
      />

      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.form, { paddingBottom: 8 }]}
          keyboardShouldPersistTaps="handled"
        >
          {formError ? <Text style={[styles.error, { color: colors.danger }]}>{formError}</Text> : null}

          {/* Type toggle */}
          <View style={[styles.typeToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {(['expense', 'income'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typeBtn,
                  form.type === t && { backgroundColor: t === 'income' ? colors.income : colors.expense },
                ]}
                onPress={() => { setField('type', t); setField('category_id', ''); }}
              >
                <Text style={[styles.typeBtnText, { color: form.type === t ? colors.onAccent : colors.muted }]}>
                  {t === 'expense' ? 'Expense' : 'Income'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Amount */}
          <View style={styles.amountSection}>
            <View style={styles.amountDisplay}>
              <Text
                style={[styles.amountText, { color: form.amount ? colors.text : colors.placeholder }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {form.amount ? (form.type === 'income' ? '+' : '−') : ''}{formatAmountDisplay(form.amount) || '0'}
              </Text>
              {currency ? <Text style={[styles.currencyLabel, { color: colors.muted }]}>{currency}</Text> : null}
            </View>
          </View>

          <FieldError message={errors.amount} center />

          {/* Name */}
          <AppInput
            label="Name"
            value={form.name}
            onChangeText={(v) => setField('name', v)}
            placeholder="e.g. Netflix"
            error={errors.name}
          />

          {/* Wallet + Category side by side */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Wallet</Text>
              <TouchableOpacity
                style={[styles.pickerBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={() => setShowWalletModal(true)}
              >
                <Text style={[styles.pickerBtnText, { color: selectedWallet ? colors.text : colors.muted }]}>
                  {selectedWallet ? `${selectedWallet.icon ? selectedWallet.icon + ' ' : ''}${selectedWallet.name}` : 'Wallet…'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Category</Text>
              <TouchableOpacity
                style={[styles.pickerBtn, { borderColor: errors.category ? colors.danger : colors.border, backgroundColor: colors.surface }]}
                onPress={() => setShowCategoryModal(true)}
              >
                <Text style={[styles.pickerBtnText, { color: selectedCategory ? colors.text : colors.muted }]}>
                  {selectedCategory ? `${selectedCategory.icon ? selectedCategory.icon + ' ' : ''}${selectedCategory.name}` : 'Category…'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </TouchableOpacity>
              <FieldError message={errors.category} />
            </View>
          </View>

          {/* Start date + Frequency side by side */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Start date</Text>
              <TouchableOpacity
                style={[styles.pickerBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={[styles.pickerBtnText, { color: form.start_date ? colors.text : colors.muted }]}>
                  {form.start_date || 'Date…'}
                </Text>
                <Ionicons name="calendar" size={16} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Frequency</Text>
              <TouchableOpacity
                style={[styles.pickerBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={() => setShowFrequencyModal(true)}
              >
                <Text style={[styles.pickerBtnText, { color: colors.text }]}>
                  {frequencyLabel(form.frequency)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center', gap: 12 }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.fieldLabel, { color: colors.muted, marginBottom: 0 }]}>Add automatically</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Nunito_600SemiBold', color: colors.muted }}>
                Record this payment on its due date without asking
              </Text>
            </View>
            <Switch
              value={form.auto_add}
              onValueChange={(v) => setField('auto_add', v)}
              trackColor={{ true: colors.accent }}
              thumbColor="#fff"
            />
          </View>

          {/* More options */}
          <TouchableOpacity
            style={[styles.moreToggle, { borderColor: colors.border }]}
            onPress={() => setMoreExpanded((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={[styles.moreToggleText, { color: colors.muted }]}>More options</Text>
            <Ionicons
              name={moreExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.muted}
            />
          </TouchableOpacity>

          {moreExpanded && (
            <>
              {labels.length > 0 && (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>Labels</Text>
                  <TouchableOpacity
                    style={[styles.pickerBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                    onPress={() => setShowLabelModal(true)}
                  >
                    <Text style={[styles.pickerBtnText, { color: selectedLabels.length ? colors.text : colors.muted }]}>
                      {selectedLabels.length > 0 ? selectedLabels.map((l) => l.name).join(', ') : 'Select labels…'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              )}

              <AppInput
                label="Payee (optional)"
                value={form.payer}
                onChangeText={(v) => setField('payer', v)}
                placeholder="e.g. OTP Bank"
              />

              <AppInput
                label="Notes (optional)"
                value={form.notes}
                onChangeText={(v) => setField('notes', v)}
                placeholder="Add a note…"
                multiline
                numberOfLines={3}
                style={{ minHeight: 80, textAlignVertical: 'top' }}
              />

              {/* End date */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>End date (optional)</Text>
                <TouchableOpacity
                  style={[styles.pickerBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text style={[styles.pickerBtnText, { color: form.end_date ? colors.text : colors.muted }]}>
                    {form.end_date || 'No end date'}
                  </Text>
                  <Ionicons name="calendar" size={18} color={colors.muted} />
                </TouchableOpacity>
                {form.end_date ? (
                  <TouchableOpacity onPress={() => setField('end_date', '')}>
                    <Text style={[styles.clearText, { color: colors.muted }]}>Clear end date</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </>
          )}

        </ScrollView>

        {/* Always-visible numpad + save */}
        <View style={[styles.bottomBlock, { borderTopColor: colors.border, paddingBottom: bottom + 8, backgroundColor: colors.surface }]}>
          <NumPad onKey={handleNumPadKey} />
          <View style={styles.saveRow}>
            <AppButton onPress={handleSave} loading={saving} fullWidth>
              Save changes
            </AppButton>
          </View>
        </View>
      </View>

      {/* Wallet picker */}
      <BottomModal visible={showWalletModal} onClose={() => setShowWalletModal(false)} title="Select account">
        {wallets.map((w) => (
          <TouchableOpacity
            key={w.id}
            style={[
              styles.modalRow,
              { borderBottomColor: colors.border },
              form.wallet_id === w.id && { backgroundColor: colors.accent + '11' },
            ]}
            onPress={() => { setField('wallet_id', w.id); setShowWalletModal(false); }}
          >
            {w.icon ? <Text style={styles.modalRowIcon}>{w.icon}</Text> : <View style={{ width: 28 }} />}
            <Text style={[styles.modalRowText, { color: form.wallet_id === w.id ? colors.accent : colors.text }]}>
              {w.name}
            </Text>
            {form.wallet_id === w.id && <Ionicons name="checkmark" size={18} color={colors.accent} />}
          </TouchableOpacity>
        ))}
      </BottomModal>

      {/* Frequency picker */}
      <BottomModal visible={showFrequencyModal} onClose={() => setShowFrequencyModal(false)} title="Frequency">
        {FREQUENCIES.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.modalRow,
              { borderBottomColor: colors.border },
              form.frequency === f && { backgroundColor: colors.accent + '11' },
            ]}
            onPress={() => { setField('frequency', f); setShowFrequencyModal(false); }}
          >
            <Text style={[styles.modalRowText, { color: form.frequency === f ? colors.accent : colors.text }]}>
              {frequencyLabel(f)}
            </Text>
            {form.frequency === f && <Ionicons name="checkmark" size={18} color={colors.accent} />}
          </TouchableOpacity>
        ))}
      </BottomModal>

      {/* Start date picker */}
      <DatePickerModal
        visible={showStartDatePicker}
        value={form.start_date || isoDate(new Date())}
        onConfirm={(d) => setField('start_date', d)}
        onClose={() => setShowStartDatePicker(false)}
      />

      {/* End date picker */}
      <DatePickerModal
        visible={showEndDatePicker}
        value={form.end_date || isoDate(new Date())}
        onConfirm={(d) => setField('end_date', d)}
        onClose={() => setShowEndDatePicker(false)}
      />

      {/* Category picker */}
      <CategoryPickerModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        categories={filteredCategories}
        selectedId={form.category_id}
        onSelect={(id) => setField('category_id', id)}
      />

      {/* Label picker */}
      <BottomModal visible={showLabelModal} onClose={() => setShowLabelModal(false)} title="Select labels">
        {labels.map((l) => {
          const selected = form.labelIds.includes(l.id);
          return (
            <TouchableOpacity
              key={l.id}
              style={[
                styles.modalRow,
                { borderBottomColor: colors.border },
                selected && { backgroundColor: l.color + '11' },
              ]}
              onPress={() => toggleLabel(l.id)}
            >
              <View style={[styles.labelDot, { backgroundColor: l.color }]} />
              <Text style={[styles.modalRowText, { color: selected ? l.color : colors.text }]}>{l.name}</Text>
              {selected && <Ionicons name="checkmark" size={18} color={l.color} />}
            </TouchableOpacity>
          );
        })}
        <View style={{ marginTop: 8 }}>
          <AppButton onPress={() => setShowLabelModal(false)} fullWidth>Done</AppButton>
        </View>
      </BottomModal>

      <ConfirmModal
        visible={confirmKind === 'delete'}
        title="Delete recurring payment"
        message="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmKind(null)}
      />
      <ConfirmModal
        visible={confirmKind === 'pause'}
        title={isActive ? 'Pause recurring payment' : 'Resume recurring payment'}
        message={isActive ? 'No future occurrences will be scheduled while paused.' : 'Future occurrences will resume being scheduled.'}
        confirmLabel={isActive ? 'Pause' : 'Resume'}
        onConfirm={handleToggleActive}
        onCancel={() => setConfirmKind(null)}
      />
      <ConfirmModal
        visible={!!pendingAction}
        title="Discard changes?"
        message="You have unsaved changes. Are you sure you want to discard them?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => { navigation.dispatch(pendingAction); setPendingAction(null); }}
        onCancel={() => setPendingAction(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  form: { padding: 16, gap: 16 },
  bottomBlock: { borderTopWidth: StyleSheet.hairlineWidth },
  saveRow: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  error: { fontFamily: 'Nunito_400Regular', fontSize: 15, textAlign: 'center' },

  typeToggle: {
    flexDirection: 'row', borderRadius: 14, borderWidth: 1,
    overflow: 'hidden', padding: 4, gap: 4,
  },
  typeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  typeBtnText: { fontSize: 15, fontFamily: 'Nunito_600SemiBold' },

  amountSection: { alignItems: 'center', gap: 4 },
  amountDisplay: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'center', paddingVertical: 8, gap: 8,
  },
  amountText: { fontSize: 52, fontFamily: 'Lora_400Regular', paddingVertical: 0 },
  currencyLabel: { fontSize: 15, fontFamily: 'Nunito_700Bold', marginBottom: 12 },

  row: { flexDirection: 'row', gap: 8 },

  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginBottom: 4 },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
  },
  pickerBtnText: { fontFamily: 'Nunito_400Regular', fontSize: 15, flex: 1 },

  moreToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed',
  },
  moreToggleText: { fontSize: 15, fontFamily: 'Nunito_600SemiBold' },
  clearText: { fontFamily: 'Nunito_400Regular', fontSize: 13, textAlign: 'right' },

  dotMenu: {
    position: 'absolute',
    top: 44,
    right: 0,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 160,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  dotMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dotMenuText: { fontSize: 15, fontFamily: 'Nunito_600SemiBold' },

  modalRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  modalRowIcon: { fontFamily: 'Nunito_400Regular', fontSize: 20, width: 28, textAlign: 'center' },
  modalRowText: { flex: 1, fontFamily: 'Nunito_400Regular', fontSize: 15 },
  labelDot: { width: 12, height: 12, borderRadius: 6 },
});
