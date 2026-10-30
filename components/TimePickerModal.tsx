import { useEffect, useState } from 'react';
import { Platform, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useTheme } from '@/lib/theme';
import BottomModal from './BottomModal';

interface Props {
  visible: boolean;
  value: string; // HH:MM, 24-hour
  onConfirm: (time: string) => void;
  onClose: () => void;
}

function parseTime(timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function toTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// "20:00" → "8:00 PM" (or "20:00" on 24-hour devices).
export function formatTime(timeStr: string): string {
  return parseTime(timeStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function TimePickerModal({ visible, value, onConfirm, onClose }: Props) {
  const colors = useTheme();
  const [selected, setSelected] = useState(() => parseTime(value));

  useEffect(() => {
    if (!visible) return;
    if (Platform.OS !== 'android') {
      setSelected(parseTime(value));
      return;
    }
    DateTimePickerAndroid.open({
      value: parseTime(value),
      mode: 'time',
      display: 'clock',
      onChange: (event, selectedDate) => {
        if (event.type === 'set' && selectedDate) {
          onConfirm(toTime(selectedDate));
        }
        onClose();
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (Platform.OS === 'android') return null;

  return (
    <BottomModal
      visible={visible}
      onClose={onClose}
      title="Reminder time"
      rightAction={
        <TouchableOpacity onPress={() => { onConfirm(toTime(selected)); onClose(); }} activeOpacity={0.7}>
          <Text style={[styles.done, { color: colors.accent }]}>Done</Text>
        </TouchableOpacity>
      }
    >
      <DateTimePicker
        value={selected}
        mode="time"
        display="spinner"
        onChange={(_event, date) => { if (date) setSelected(date); }}
      />
    </BottomModal>
  );
}

const styles = StyleSheet.create({
  done: { fontFamily: 'Nunito_700Bold', fontSize: 15 },
});
