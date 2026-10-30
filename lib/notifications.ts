import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const KEY_AUTO_PAYMENTS = 'purrfolio_notify_auto_payments';
const KEY_DAILY_REMINDER = 'purrfolio_notify_daily_reminder';
const KEY_REMINDER_TIME = 'purrfolio_notify_reminder_time';

const CHANNEL_ID = 'default';
const DAILY_REMINDER_ID = 'daily-reminder';
const DEFAULT_REMINDER_TIME = '20:00'; // HH:MM, 24-hour

// Show notifications as a banner even while the app is open: auto-added
// payments are created while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function hasNotificationPermission(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

// Asks for permission when it hasn't been decided yet. Returns whether it is granted.
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    await ensureChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

async function readFlag(key: string): Promise<boolean> {
  return (await AsyncStorage.getItem(key)) === 'true';
}

export const isAutoPaymentNotificationEnabled = () => readFlag(KEY_AUTO_PAYMENTS);
export const isDailyReminderEnabled = () => readFlag(KEY_DAILY_REMINDER);

export async function setAutoPaymentNotificationEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_AUTO_PAYMENTS, enabled ? 'true' : 'false');
}

export async function setDailyReminderEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_DAILY_REMINDER, enabled ? 'true' : 'false');
  await syncDailyReminder();
}

export async function getDailyReminderTime(): Promise<string> {
  return (await AsyncStorage.getItem(KEY_REMINDER_TIME)) ?? DEFAULT_REMINDER_TIME;
}

export async function setDailyReminderTime(time: string): Promise<void> {
  await AsyncStorage.setItem(KEY_REMINDER_TIME, time);
  await syncDailyReminder();
}

// Makes the scheduled daily reminder match the saved setting. Safe to call repeatedly.
export async function syncDailyReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
    if (!(await isDailyReminderEnabled()) || !(await hasNotificationPermission())) return;
    await ensureChannel();
    const [hour, minute] = (await getDailyReminderTime()).split(':').map(Number);
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: {
        title: 'Time to log your expenses',
        body: 'Add today’s spending to keep your Purrfolio up to date.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: CHANNEL_ID,
      },
    });
  } catch {
    // Notifications are a convenience; never break the app over them.
  }
}

export async function cancelDailyReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
  } catch {}
}

// Tells the user which planned payments were just added automatically.
export async function notifyAutoAddedPayments(names: string[]): Promise<void> {
  try {
    if (names.length === 0) return;
    if (!(await isAutoPaymentNotificationEnabled()) || !(await hasNotificationPermission())) return;
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: names.length === 1 ? 'Planned payment added' : `${names.length} planned payments added`,
        body: names.length === 1
          ? `${names[0]} was added to your transactions.`
          : `${names.join(', ')} were added to your transactions.`,
      },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
    });
  } catch {}
}
