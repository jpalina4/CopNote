/**
 * Login: regimental number + PIN.
 *
 * Controlled form: every input's value lives in React state (`form`), and
 * every change produces a NEW state object (immutable update via spread).
 */
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import AppButton from '../components/AppButton';
import Screen from '../components/Screen';
import TextField from '../components/TextField';
import { Banner } from '../components/StateViews';
import { colors, FORM_MAX_WIDTH, spacing, type } from '../components/theme';
import { useAuth } from '../services/AuthContext';
import { hasErrors, validateLogin } from '../utils/validation';

// The shield mark on a transparent background (same image as the splash screen).
const logo = require('../../assets/splash-icon.png');

export default function LoginScreen() {
  const { login } = useAuth();
  const [form, setForm] = useState({ regimentalNumber: '', pin: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const setField = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const onSubmit = async () => {
    const found = validateLogin(form);
    setErrors(found);
    setFormError('');
    if (hasErrors(found)) return;

    setBusy(true);
    try {
      await login(form); // on success the router guard switches to the app screens
    } catch (e) {
      setFormError(e.message);
      setForm((prev) => ({ ...prev, pin: '' }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} contentStyle={{ maxWidth: FORM_MAX_WIDTH }}>
      <View style={styles.brand}>
        <Image source={logo} style={styles.logo} accessibilityIgnoresInvertColors />
        <Text style={styles.appName} accessibilityLabel="CopNote">
          Cop<Text style={styles.appNameAccent}>Note</Text>
        </Text>
        <Text style={styles.tagline}>Digital pocket notebook</Text>
      </View>

      <Banner kind="error" message={formError} />

      <TextField
        label="Regimental number"
        value={form.regimentalNumber}
        onChangeText={setField('regimentalNumber')}
        error={errors.regimentalNumber}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="e.g. 10452"
      />
      <TextField
        label="PIN"
        value={form.pin}
        onChangeText={setField('pin')}
        error={errors.pin}
        secureTextEntry
        keyboardType="number-pad"
        maxLength={6}
        placeholder="4–6 digits"
        onSubmitEditing={onSubmit}
      />

      <AppButton title="Log in" icon="log-in-outline" onPress={onSubmit} loading={busy} />

      <View style={styles.register}>
        <Text style={type.small}>New to CopNote on this device?</Text>
        <Link href="/register" style={styles.link} accessibilityRole="link">
          Register as an officer
        </Link>
      </View>

      <View style={styles.demo}>
        <Text style={[type.small, styles.demoTitle]}>Demo accounts (fictional)</Text>
        <Text style={type.small}>10452 · PIN 2580 — Snr Const. Joseph Tau</Text>
        <Text style={type.small}>RPNGC-7731 · PIN 1357 — Sgt Grace Waim</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', marginVertical: spacing.xl },
  logo: { width: 120, height: 120 },
  appName: { ...type.title, fontSize: 32, color: colors.primary },
  appNameAccent: { color: colors.brandRed },
  tagline: { ...type.small, fontSize: 15 },
  register: { alignItems: 'center', marginTop: spacing.xl },
  link: { color: colors.primary, fontSize: 16, fontWeight: '700', padding: spacing.md, textDecorationLine: 'underline' },
  demo: { marginTop: spacing.xl, padding: spacing.md, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  demoTitle: { fontWeight: '700', marginBottom: 4 },
});
