import { useState, useEffect, useRef, type ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Switch,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import Avatar from '@/components/Avatar';
import { useProfile } from '@/lib/profile';
import Constants from 'expo-constants';
import { useTheme, useDarkMode } from '@/lib/theme';

interface Props {
  title: string;
  rightAction?: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
}

const DRAWER_WIDTH = Math.min(300, Dimensions.get('window').width * 0.8);

export default function AppHeader({ title, rightAction, showBack, onBack }: Props) {
  const colors = useTheme();
  const { isDark, setIsDark } = useDarkMode();
  const router = useRouter();
  const pathname = usePathname();
  const { top, bottom } = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const { name: username, email, avatarUrl, isAdmin } = useProfile();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  function openDrawer() {
    slideAnim.setValue(-DRAWER_WIDTH);
    fadeAnim.setValue(0);
    setOpen(true);
  }

  function closeDrawer(cb?: () => void) {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -DRAWER_WIDTH, duration: 220, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0,             duration: 220, useNativeDriver: true }),
    ]).start(() => { setOpen(false); cb?.(); });
  }

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    }
  }, [open]);

  function navigate(route: string) { closeDrawer(() => router.push(route as any)); }

  type MenuItem = { label: string; route: string; icon: keyof typeof Ionicons.glyphMap };
  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Manage',
      items: [
        { label: 'Accounts',   route: '/settings/accounts',   icon: 'wallet-outline'   },
        { label: 'Categories', route: '/settings/categories', icon: 'grid-outline'     },
        { label: 'Labels',     route: '/settings/labels',     icon: 'pricetag-outline' },
      ],
    },
    {
      title: 'Data & security',
      items: [
        { label: 'Security',        route: '/settings/security', icon: 'lock-closed-outline' },
        { label: 'Import & export', route: '/settings/export',   icon: 'swap-vertical-outline' },
      ],
    },
  ];

  return (
    <>
      {/* ── Fixed top bar ────────────────────────────────────────────── */}
      <View style={styles.bar}>
        <View style={styles.side}>
          <TouchableOpacity
            onPress={showBack ? (onBack ?? (() => router.back())) : openDrawer}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={showBack ? 'Back' : 'Open menu'}
            style={[styles.iconBtn, { backgroundColor: colors.glassStrong, borderColor: colors.border, shadowColor: colors.shadow }]}
          >
            <Ionicons name={showBack ? 'arrow-back' : 'menu'} size={20} color={showBack ? colors.accent : colors.text} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.barTitle, { color: colors.heading }]} numberOfLines={1}>{title}</Text>
        <View style={[styles.side, styles.sideRight]}>
          {rightAction ?? null}
        </View>
      </View>

      {/* ── Slide-in drawer ──────────────────────────────────────────── */}
      <Modal visible={open} transparent animationType="none" onRequestClose={() => closeDrawer()}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: fadeAnim }]}
          pointerEvents="none"
        />

        <View style={styles.drawerRow}>
          <Animated.View style={[
            styles.drawer,
            { backgroundColor: colors.surface, borderColor: colors.border, transform: [{ translateX: slideAnim }] },
          ]}>
            <View style={[styles.drawerInner, { paddingTop: top || 16 }]}>
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* ── Profile ──────────────────────────────────── */}
                <TouchableOpacity
                  style={[styles.userRow, { backgroundColor: colors.bg }]}
                  onPress={() => navigate('/settings/account')}
                  activeOpacity={0.7}
                  accessibilityLabel="Open profile"
                >
                  <Avatar size={44} uri={avatarUrl} label={username || email} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                      {username || 'My Account'}
                    </Text>
                    {email ? (
                      <Text style={[styles.userEmail, { color: colors.muted }]} numberOfLines={1}>{email}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </TouchableOpacity>

                {sections.map((section) => (
                  <View key={section.title}>
                    <Text style={[styles.sectionLabel, { color: colors.muted }]}>{section.title}</Text>
                    {section.items.map((item) => (
                      <TouchableOpacity
                        key={item.label}
                        style={styles.row}
                        onPress={() => navigate(item.route)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={item.icon} size={22} color={colors.text} />
                        <Text style={[styles.rowText, { color: colors.text }]}>{item.label}</Text>
                      </TouchableOpacity>
                    ))}
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  </View>
                ))}

                <TouchableOpacity style={styles.row} onPress={() => navigate('/settings/help')} activeOpacity={0.7}>
                  <Ionicons name="help-circle-outline" size={22} color={colors.text} />
                  <Text style={[styles.rowText, { color: colors.text }]}>Help & about</Text>
                </TouchableOpacity>
                <View style={styles.row}>
                  <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={22} color={colors.text} />
                  <Text style={[styles.rowText, { color: colors.text }]}>Dark mode</Text>
                  <Switch
                    value={isDark}
                    onValueChange={setIsDark}
                    accessibilityLabel="Dark mode"
                    trackColor={{ false: colors.border, true: colors.accent + '88' }}
                    thumbColor={isDark ? colors.accent : '#f4f4f4'}
                  />
                </View>

              </ScrollView>

              {isAdmin && (
                <Text style={[styles.version, { color: colors.muted }]}>
                  Version {Constants.expoConfig?.version ?? '–'}
                </Text>
              )}

              <View style={[styles.footer, { paddingBottom: bottom || 16 }]}>
                <TouchableOpacity style={styles.row} onPress={() => navigate(`/settings/feedback?from=${encodeURIComponent(pathname)}`)} activeOpacity={0.7}>
                  <Ionicons name="bug-outline" size={22} color={colors.text} />
                  <Text style={[styles.rowText, { color: colors.text }]}>Report a bug</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closeDrawer()} />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    paddingHorizontal: 16,
  },
  side: { width: 38 },
  sideRight: { alignItems: 'flex-end' },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  barTitle: { flex: 1, textAlign: 'center', fontSize: 24, fontFamily: 'Lora_700Bold', letterSpacing: -0.5 },

  drawerRow: { flex: 1, flexDirection: 'row' },
  drawer: {
    width: DRAWER_WIDTH,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopRightRadius: 26,
    borderBottomRightRadius: 26,
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
  },
  drawerInner: { flex: 1 },
  scrollContent: { paddingBottom: 8 },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  userName: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
  userEmail: { fontSize: 12, fontFamily: 'Nunito_400Regular', marginTop: 2 },

  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 48,
    paddingHorizontal: 24,
  },
  rowText: { flex: 1, fontSize: 15, fontFamily: 'Nunito_700Bold' },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 24, marginTop: 8 },

  version: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', paddingHorizontal: 24, paddingBottom: 10 },
  footer: { paddingTop: 8 },
});
