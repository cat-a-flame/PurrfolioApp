import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme';

type Props = {
  visible: boolean;
  message: string;
  success: boolean;
  bottomOffset?: number;
  onUndo?: () => void;
};

export default function Toast({ visible, message, success, bottomOffset = 100, onUndo }: Props) {
  const colors = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: visible ? 0 : 16,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, opacity, translateY]);

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[
        styles.toast,
        {
          bottom: bottomOffset,
          backgroundColor: success ? colors.income : colors.danger,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Ionicons
        name={success ? 'checkmark-circle' : 'close-circle'}
        size={18}
        color={colors.onAccent}
      />
      <Text style={[styles.text, { color: colors.onAccent }]}>{message}</Text>
      {onUndo && (
        <TouchableOpacity onPress={onUndo} hitSlop={8}>
          <Text style={[styles.undoBtn, { color: colors.onAccent }]}>Undo</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
  },
  text: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Nunito_600SemiBold',
  },
  undoBtn: {
    fontSize: 15,
    fontFamily: 'Nunito_700Bold',
    textDecorationLine: 'underline',
    opacity: 0.9,
  },
});
