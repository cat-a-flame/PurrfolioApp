import { supabase } from './supabase';
import { generateDueDates, isoDate } from './recurringUtils';
import { Events } from './events';

let inFlight: Promise<number> | null = null;

// Records every auto-add recurring payment that is due today and not yet actioned.
// Returns how many transactions were created.
export function autoAddDuePayments(): Promise<number> {
  if (!inFlight) inFlight = run().finally(() => { inFlight = null; });
  return inFlight;
}

async function run(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const today = new Date();
  const todayStr = isoDate(today);
  const start = new Date(today); start.setHours(0, 0, 0, 0);
  const end = new Date(today); end.setHours(23, 59, 59, 999);

  const [{ data: pmts }, { data: occs }] = await Promise.all([
    supabase.from('recurring_payments').select('*').eq('user_id', user.id).eq('is_active', true).eq('auto_add', true),
    supabase.from('recurring_occurrences').select('recurring_payment_id').eq('user_id', user.id).eq('due_date', todayStr),
  ]);
  if (!pmts?.length) return 0;

  const actioned = new Set((occs ?? []).map((o: any) => o.recurring_payment_id));
  let added = 0;
  for (const p of pmts as any[]) {
    if (actioned.has(p.id) || generateDueDates(p, start, end).length === 0) continue;

    const { data: tx, error } = await supabase.from('transactions')
      .insert({
        user_id: user.id, type: p.type, amount: p.amount, wallet_id: p.wallet_id,
        category_id: p.category_id, date: todayStr, notes: p.notes, payer: p.payer,
      })
      .select('id').single();
    if (error || !tx) continue;

    const { error: occErr } = await supabase.from('recurring_occurrences').insert({
      recurring_payment_id: p.id, user_id: user.id, due_date: todayStr, status: 'paid', transaction_id: tx.id,
    });
    if (occErr) {
      // Without the occurrence it would be added again on the next run.
      await supabase.from('transactions').delete().eq('id', tx.id);
      continue;
    }
    added++;
  }
  if (added > 0) Events.emit('transaction-saved', { success: true });
  return added;
}
