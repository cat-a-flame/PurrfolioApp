import { type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme';

export function SectionLabel({ children, danger }: { children: string; danger?: boolean }) {
  const colors = useTheme();
  return (
    <Text style={[styles.sectionLabel, { color: danger ? colors.danger : colors.muted }]}>{children}</Text>
  );
}

/** Rounded white card that groups rows and draws hairline dividers between them. */
export function ListCard({ children, danger }: { children: ReactNode[] | ReactNode; danger?: boolean }) {
  const colors = useTheme();
  const rows = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: danger ? colors.dangerLight : colors.border }]}>
      {rows.map((row, i) => (
        <View key={i}>
          {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
          {row}
        </View>
      ))}
    </View>
  );
}

type RowProps = {
  label: string;
  /** Small text under the label. */
  caption?: string;
  /** Small text above the label, for form-style rows (e.g. "Email"). */
  eyebrow?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** Trailing glyph: chevron for in-app navigation, open for external links. */
  trailing?: 'chevron' | 'external' | ReactNode;
  danger?: boolean;
};

export function ListRow({ label, caption, eyebrow, icon, onPress, trailing = 'chevron', danger }: RowProps) {
  const colors = useTheme();
  const tint = danger ? colors.danger : colors.accent;
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole={trailing === 'external' ? 'link' : 'button'}
    >
      {icon && (
        <View style={[styles.rowIcon, { backgroundColor: danger ? colors.dangerLight : colors.accentLight }]}>
          <Ionicons name={icon} size={18} color={tint} />
        </View>
      )}
      <View style={styles.rowBody}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: colors.muted }]}>{eyebrow}</Text> : null}
        <Text style={[styles.rowLabel, { color: danger ? colors.danger : colors.text }]}>{label}</Text>
        {caption ? <Text style={[styles.caption, { color: colors.muted }]}>{caption}</Text> : null}
      </View>
      {trailing === 'chevron' ? (
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      ) : trailing === 'external' ? (
        <Ionicons name="open-outline" size={16} color={colors.muted} />
      ) : (
        trailing
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  card: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  eyebrow: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  rowLabel: { fontSize: 16, fontFamily: 'Nunito_700Bold' },
  caption: { fontSize: 12, fontFamily: 'Nunito_400Regular', lineHeight: 17 },
});
