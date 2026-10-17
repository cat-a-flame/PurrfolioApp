import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/theme';

type Props = {
  size: number;
  uri?: string | null;
  /** Used for the initial shown when there is no photo. */
  label?: string | null;
};

export default function Avatar({ size, uri, label }: Props) {
  const colors = useTheme();
  const box = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={[box, { backgroundColor: colors.surface3 }]} accessibilityIgnoresInvertColors />;
  }
  return (
    <LinearGradient colors={colors.gradientAccent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[box, styles.center]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{(label || '?').charAt(0).toUpperCase()}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: 'Nunito_800ExtraBold', color: '#fff' },
});
