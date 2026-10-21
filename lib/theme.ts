import { useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Palette mirrors the PurrfolioWeb design tokens (app/globals.css) so the
// app and the web share one look: violet → fuchsia → pink accents on a soft
// neutral canvas with glassy cards.
export const lightColors = {
  bg: '#f6f6f8',
  bg2: '#f5f1fe',
  surface: '#ffffff',
  surface2: '#f5f1fe',
  surface3: '#ebe4fb',
  // Card fills are opaque: RN has no backdrop blur, and Android elevation
  // shadows show through translucent fills as a grey band around the content.
  glass: '#ffffff',
  glassStrong: '#ffffff',
  glassBorder: '#e8e1f6',
  accent: '#7433e6',
  accentLight: '#f1eafe',
  accentBorder: 'rgba(116,51,230,0.22)',
  accentGlow: 'rgba(116,51,230,0.4)',
  accent2: '#d6297a',
  accent3: '#0ea5c6',
  text: '#5f4c79',
  heading: '#2b1452',
  muted: '#6f6280',
  faint: '#746a8b',
  danger: '#d2223f',
  dangerLight: '#fdecef',
  income: '#0f7a57',
  incomeLight: '#d3f5e6',
  expense: '#d2223f',
  expenseLight: '#fdecef',
  warning: '#b3801f',
  warningLight: '#fdf1de',
  onAccent: '#ffffff', // text/icons on solid accent/income/expense/danger fills
  border: '#e8e1f6',
  border2: '#f0ebfa',
  tabBar: '#ffffff', // opaque: RN has no backdrop blur, and Android elevation shadows bleed through translucency
  card: '#ffffff',
  placeholder: '#746a8b',
  overlay: 'rgba(28,16,52,0.38)',
  shadow: '#3c1e6e',
  gradientAccent: ['#7433e6', '#b62ad9', '#dc2d6d'] as const,
  gradientCashflow: ['#2c1370', '#5a22c8', '#9b2bc9'] as const,
};

export const darkColors: Colors = {
  bg: '#0c0b10',
  bg2: '#1d1633',
  surface: '#140e24',
  surface2: '#1d1633',
  surface3: '#2a2147',
  glass: '#140e24',
  glassStrong: '#140e24',
  glassBorder: '#2c2346',
  accent: '#a78bfa',
  accentLight: '#251a45',
  accentBorder: 'rgba(167,139,250,0.28)',
  accentGlow: 'rgba(167,139,250,0.45)',
  accent2: '#f472b6',
  accent3: '#22d3ee',
  text: '#f4efff',
  heading: '#ffffff',
  muted: '#b3a7d0',
  faint: '#887cab',
  danger: '#ff6b7d',
  dangerLight: '#3a1220',
  income: '#4ef0a8',
  incomeLight: '#0b2c20',
  expense: '#ff6b7d',
  expenseLight: '#3a1220',
  warning: '#f5c46b',
  warningLight: '#3a2a10',
  onAccent: '#140e24',
  border: '#2c2346',
  border2: '#231b3b',
  tabBar: '#1a1330',
  card: '#140e24',
  placeholder: '#887cab',
  overlay: 'rgba(4,0,12,0.66)',
  shadow: '#000000',
  gradientAccent: ['#7c4dff', '#c026d3', '#e02865'],
  gradientCashflow: ['#2c1370', '#5a22c8', '#9b2bc9'],
};

// Shared shape scale (matches the web --radius-* tokens)
export const radius = { xs: 4, sm: 10, md: 14, lg: 18, xl: 26, full: 9999 } as const;

// Spacing (4-pt grid) and type ramp. Style values should snap to these.
export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const fontSize = { caption: 11, footnote: 12, small: 13, body: 15, subhead: 17, title3: 20, title2: 24, title1: 28, display: 36, hero: 52 } as const;

type Widen<T> = { [K in keyof T]: T[K] extends readonly string[] ? readonly [string, string, ...string[]] : string };
export type Colors = Widen<typeof lightColors>;

// ── Module-level dark-mode override (pub-sub, no context/provider needed) ──

const STORAGE_KEY = '@purrfolio/theme';
let _override: boolean | null = null; // null = follow system
const _subs = new Set<() => void>();

function _notify() { _subs.forEach(fn => fn()); }

export async function loadThemePreference() {
  const v = await AsyncStorage.getItem(STORAGE_KEY);
  if (v === 'dark') _override = true;
  else if (v === 'light') _override = false;
  _notify();
}

export function setDarkMode(v: boolean) {
  _override = v;
  AsyncStorage.setItem(STORAGE_KEY, v ? 'dark' : 'light');
  _notify();
}

function _useIsDark(): boolean {
  const system = useColorScheme();
  const [, tick] = useState(0);
  useEffect(() => {
    const sub = () => tick(n => n + 1);
    _subs.add(sub);
    return () => { _subs.delete(sub); };
  }, []);
  return _override !== null ? _override : system === 'dark';
}

export function useTheme(): Colors {
  return _useIsDark() ? darkColors : lightColors;
}

export function useDarkMode(): { isDark: boolean; setIsDark: (v: boolean) => void } {
  return { isDark: _useIsDark(), setIsDark: setDarkMode };
}
