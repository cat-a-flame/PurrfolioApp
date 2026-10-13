import type { AccountType, Currency } from './types';

// Same list and labels as PurrfolioWeb (lib/utils.ts)
export const ACCOUNT_TYPES: AccountType[] = ['bank', 'cash', 'savings', 'credit_card', 'investment', 'bond', 'crypto', 'other'];
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: 'Bank',
  cash: 'Cash',
  savings: 'Savings',
  credit_card: 'Credit card',
  investment: 'Investment',
  bond: 'Bond',
  crypto: 'Crypto',
  other: 'Other',
};

function withThousands(n: number, sep: string, decimals = 0): string {
  const fixed = Math.abs(n).toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  const sign = n < 0 ? '-' : '';
  return decPart !== undefined ? `${sign}${grouped}.${decPart}` : `${sign}${grouped}`;
}

export function formatCurrency(amount: number, currency: Currency): string {
  try {
    const locale = currency === 'HUF' ? 'hu-HU' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'HUF' ? 0 : 2,
    }).format(amount);
  } catch {
    if (currency === 'HUF') return `${withThousands(amount, ' ')} Ft`;
    if (currency === 'EUR') return `€${withThousands(amount, ',', 2)}`;
    return `$${withThousands(amount, ',', 2)}`;
  }
}

export function formatHUF(amount: number): string {
  return formatCurrency(amount, 'HUF');
}

export function formatNumber(amount: number): string {
  try {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount);
  } catch {
    return withThousands(amount, ',', 2);
  }
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDayHeader(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

export function todayInputDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function groupByDate<T extends { date: string }>(items: T[]): { date: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const d = item.date.slice(0, 10);
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(item);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, items }));
}

// Keeps only the first emoji (grapheme) of the input, so icon fields hold exactly one.
// Hand-rolled instead of Intl.Segmenter, which Hermes may not ship.
export function firstEmoji(input: string): string {
  const cps = Array.from(input);
  if (cps.length === 0) return '';
  const code = (i: number) => cps[i].codePointAt(0)!;
  const isRegional = (c: number) => c >= 0x1f1e6 && c <= 0x1f1ff;
  const isExtender = (c: number) =>
    c === 0xfe0f || c === 0xfe0e || c === 0x20e3 ||
    (c >= 0x1f3fb && c <= 0x1f3ff) || (c >= 0xe0020 && c <= 0xe007f);

  let end = 1;
  if (isRegional(code(0)) && cps.length > 1 && isRegional(code(1))) end = 2;
  while (end < cps.length) {
    const c = code(end);
    if (isExtender(c)) end++;
    else if (c === 0x200d && end + 1 < cps.length) end += 2;
    else break;
  }
  return cps.slice(0, end).join('');
}
