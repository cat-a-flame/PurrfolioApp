import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import BottomModal from '@/components/BottomModal';
import Avatar from '@/components/Avatar';
import { ListCard, ListRow, SectionLabel } from '@/components/SettingsList';
import { useProfile } from '@/lib/profile';
import ConfirmModal from '@/components/ConfirmModal';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase, verifyPassword } from '@/lib/supabase';
import { disablePin } from '@/lib/security';
import { useBaseCurrencyState } from '@/lib/baseCurrencyContext';
import { Events } from '@/lib/events';
import { useTheme } from '@/lib/theme';
import AppHeader from '@/components/AppHeader';
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';

type EditTarget = 'name' | 'email' | 'password' | null;

export default function AccountScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { setBaseCurrency } = useBaseCurrencyState();

  const profile = useProfile();
  const [editing, setEditing] = useState<EditTarget>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<'data' | 'account' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  function openEdit(target: Exclude<EditTarget, null>) {
    setUsername(profile.name ?? '');
    setEmail(profile.email ?? '');
    setPasswordError('');
    setEditing(target);
  }

  function closeEdit() { setEditing(null); }

  async function uploadAvatar(uri: string) {
    setUploadingPhoto(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in.');
      const path = `${user.id}/avatar.jpg`;
      const body = await (await fetch(uri)).arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, body, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      // The path never changes, so a version query keeps the old photo from being served from cache.
      const { error } = await supabase.auth.updateUser({ data: { avatar_url: `${data.publicUrl}?v=${Date.now()}` } });
      if (error) throw error;
      Events.emit('profile-updated');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not update your photo.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) await uploadAvatar(result.assets[0].uri);
  }

  async function removePhoto() {
    setUploadingPhoto(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.storage.from('avatars').remove([`${user.id}/avatar.jpg`]);
    const { error } = await supabase.auth.updateUser({ data: { avatar_url: null } });
    setUploadingPhoto(false);
    if (error) Alert.alert('Error', error.message);
    else Events.emit('profile-updated');
  }

  function handlePhotoPress() {
    if (uploadingPhoto) return;
    Alert.alert('Profile photo', undefined, [
      { text: 'Choose from library', onPress: pickPhoto },
      ...(profile.avatarUrl ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: removePhoto }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  async function handleSaveUsername() {
    if (!username.trim()) {
      Alert.alert('Error', 'Username cannot be blank.');
      return;
    }
    setSavingUsername(true);
    const { error } = await supabase.auth.updateUser({ data: { name: username.trim() } });
    setSavingUsername(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Events.emit('profile-updated');
      closeEdit();
    }
  }

  async function handleSaveEmail() {
    if (!email.trim()) return;
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    setSavingEmail(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      closeEdit();
      Alert.alert('Check your inbox', 'A confirmation link has been sent to your new email address.');
    }
  }

  async function handleChangePassword() {
    setPasswordError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }
    setSavingPassword(true);
    // Stops someone at an unlocked, signed-in phone from changing the password.
    const { data: { user } } = await supabase.auth.getUser();
    if (!(await verifyPassword(user?.email ?? '', currentPassword))) {
      setSavingPassword(false);
      setPasswordError('Current password is incorrect.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      setPasswordError(error.message);
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    closeEdit();
    Alert.alert('Saved', 'Password updated.');
  }

  function handleSignOut() {
    setConfirmAction(() => async () => {
      await supabase.auth.signOut();
      router.replace('/(auth)/login');
    });
  }

  function openDelete(target: 'data' | 'account') {
    setDeleteError('');
    setDeleteTarget(target);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');

    if (deleteTarget === 'data') {
      const { error } = await supabase.rpc('delete_my_data');
      if (error) {
        setDeleting(false);
        setDeleteError(error.message);
        return;
      }
      // No accounts are left, so clearing the base currency sends the user back through
      // onboarding to pick a new one (the root layout handles the redirect).
      await setBaseCurrency(null);
      Events.emit('wallet-saved');
      setDeleting(false);
      setDeleteTarget(null);
      return;
    }

    // The photo lives in Storage, which the database function can't clean up, and removing it needs
    // the signed-in session. So it goes first, and a failure stops the deletion rather than orphaning it.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error: photoError } = await supabase.storage.from('avatars').remove([`${user.id}/avatar.jpg`]);
      if (photoError) {
        setDeleting(false);
        setDeleteError(photoError.message);
        return;
      }
    }

    const { error } = await supabase.rpc('delete_my_account');
    if (error) {
      // The account survived, so don't leave it pointing at the photo that was just removed.
      await supabase.auth.updateUser({ data: { avatar_url: null } });
      Events.emit('profile-updated');
      setDeleting(false);
      setDeleteError(error.message);
      return;
    }
    // The app lock PIN belongs to the deleted account, so don't leave it gating the next login.
    await disablePin();
    // The user no longer exists server-side, so only clear the local session.
    await supabase.auth.signOut({ scope: 'local' });
    setDeleting(false);
    setDeleteTarget(null);
    router.replace('/(auth)/login');
  }

  const saveLabel = (busy: boolean, label: string, onPress: () => void) =>
    busy ? (
      <ActivityIndicator color={colors.accent} style={{ alignSelf: 'flex-end' }} />
    ) : (
      <AppButton onPress={onPress}>{label}</AppButton>
    );

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.bg }]}>
      <AppHeader title="Profile" leading="back" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <View style={styles.hero}>
          <View>
            <Avatar size={88} uri={profile.avatarUrl} label={profile.name || profile.email} />
            <TouchableOpacity
              onPress={handlePhotoPress}
              activeOpacity={0.7}
              accessibilityLabel="Change photo"
              style={[styles.photoBtn, { backgroundColor: colors.accent, borderColor: colors.bg }]}
            >
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color={colors.onAccent} />
              ) : (
                <Ionicons name="camera-outline" size={18} color={colors.onAccent} />
              )}
            </TouchableOpacity>
          </View>
          <Text style={[styles.heroName, { color: colors.heading }]}>{profile.name || 'My Account'}</Text>
        </View>

        <View>
          <SectionLabel>Personal details</SectionLabel>
          <ListCard>
            <ListRow eyebrow="Display name" label={profile.name || 'Not set'} onPress={() => openEdit('name')} />
            <ListRow eyebrow="Email" label={profile.email ?? ''} onPress={() => openEdit('email')} />
            <ListRow
              eyebrow="Password"
              label="••••••••"
              onPress={() => openEdit('password')}
              trailing={<Text style={[styles.changeText, { color: colors.accent }]}>Change</Text>}
            />
          </ListCard>
        </View>

        <ListCard>
          <ListRow label="Sign out" icon="log-out-outline" onPress={handleSignOut} trailing={null} />
        </ListCard>

        <View>
          <SectionLabel danger>Danger zone</SectionLabel>
          <ListCard danger>
            <ListRow
              danger
              icon="trash-outline"
              label="Delete expense data"
              caption="Clears your accounts, transactions, categories and labels. You stay signed in."
              onPress={() => openDelete('data')}
              trailing={null}
            />
            <ListRow
              danger
              icon="person-remove-outline"
              label="Delete account"
              caption="Removes your account and all expense data. This can't be undone."
              onPress={() => openDelete('account')}
              trailing={null}
            />
          </ListCard>
        </View>

      </ScrollView>

      <BottomModal visible={editing === 'name'} onClose={closeEdit} title="Display name">
        <AppInput
          label="Username"
          value={username}
          onChangeText={setUsername}
          placeholder="Enter a username"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {saveLabel(savingUsername, 'Save', handleSaveUsername)}
      </BottomModal>

      <BottomModal visible={editing === 'email'} onClose={closeEdit} title="Email">
        <AppInput
          label="Email address"
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={[styles.hint, { color: colors.muted }]}>
          A confirmation link will be sent to verify the new address.
        </Text>
        {saveLabel(savingEmail, 'Save', handleSaveEmail)}
      </BottomModal>

      <BottomModal visible={editing === 'password'} onClose={closeEdit} title="Change password">
        <AppInput
          label="Current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
        />
        <AppInput
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
        />
        <AppInput
          label="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          error={passwordError || undefined}
        />
        {saveLabel(savingPassword, 'Update password', handleChangePassword)}
      </BottomModal>

      <ConfirmModal
        visible={!!confirmAction}
        title="Sign out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign out"
        onConfirm={() => { confirmAction?.(); setConfirmAction(null); }}
        onCancel={() => setConfirmAction(null)}
      />
      <DeleteAccountModal
        visible={!!deleteTarget}
        title={deleteTarget === 'data' ? 'Delete all data?' : 'Delete your account?'}
        intro={
          deleteTarget === 'data'
            ? 'All your transactions, recurring payments, templates, accounts, categories and labels will be permanently deleted. Your account and login will be kept.'
            : 'Your account and all of its data (transactions, recurring payments, templates, accounts, categories and labels) will be permanently deleted, and you will be signed out.'
        }
        confirmLabel={deleteTarget === 'data' ? 'Delete all data' : 'Delete account'}
        loading={deleting}
        error={deleteError}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingHorizontal: 16, paddingBottom: 40, gap: 20 },
  hero: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  heroName: { fontSize: 20, fontFamily: 'Lora_700Bold', letterSpacing: -0.2 },
  photoBtn: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeText: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  hint: { fontSize: 12, fontFamily: 'Nunito_400Regular' },
});
