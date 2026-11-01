/**
 * Shown on top of the app after inactivity or a restart. It covers the
 * screens instead of replacing them, so an unsaved page is still there
 * after the officer unlocks.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../components/AppButton';
import Screen from '../components/Screen';
import TextField from '../components/TextField';
import { Banner } from '../components/StateViews';
import { colors, spacing, type } from '../components/theme';
import { useAuth } from '../services/AuthContext';
import { isValidPin } from '../utils/validation';

export default function LockScreen() {
  const { officer, unlock, logout } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onUnlock = async () => {
    if (!isValidPin(pin)) return setError('Enter your 4 to 6 digit PIN.');
    setBusy(true);
    setError('');
    try {
      await unlock(pin);
    } catch (e) {
      setError(e.message);
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Screen edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Ionicons name="lock-closed" size={56} color={colors.primary} />
          <Text style={[type.title, styles.gap]}>CopNote is locked</Text>
          <Text style={type.small}>
            {officer.rank} {officer.fullName} · {officer.regimentalNumber}
          </Text>
        </View>
        <Banner kind="error" message={error} />
        <TextField label="PIN" value={pin} onChangeText={setPin} secureTextEntry keyboardType="number-pad" maxLength={6} autoFocus onSubmitEditing={onUnlock} />
        <AppButton title="Unlock" icon="lock-open-outline" onPress={onUnlock} loading={busy} />
        <AppButton title="Log out / switch officer" variant="ghost" onPress={logout} style={styles.gap} />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginVertical: spacing.xl },
  gap: { marginTop: spacing.md },
});
