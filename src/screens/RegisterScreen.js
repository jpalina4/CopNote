/** Officer registration. */
import { useState } from 'react';
import { Text } from 'react-native';
import AppButton from '../components/AppButton';
import ChipGroup from '../components/ChipGroup';
import Screen from '../components/Screen';
import TextField from '../components/TextField';
import { Banner } from '../components/StateViews';
import { spacing, type } from '../components/theme';
import { useAuth } from '../services/AuthContext';
import { RANKS } from '../utils/constants';
import { hasErrors, validateRegistration } from '../utils/validation';

const INITIAL = { fullName: '', regimentalNumber: '', rank: '', station: '', pin: '', confirmPin: '' };

export default function RegisterScreen() {
  const { register } = useAuth();
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const setField = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const onSubmit = async () => {
    const found = validateRegistration(form);
    setErrors(found);
    setFormError(hasErrors(found) ? 'Please fix the highlighted fields.' : '');
    if (hasErrors(found)) return;

    setBusy(true);
    try {
      await register(form);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text style={[type.small, { marginBottom: spacing.lg }]}>
        Your account is stored only on this device. Your PIN is never stored; only a secure hash of it is kept.
      </Text>
      <Banner kind="error" message={formError} />

      <TextField label="Full name" required value={form.fullName} onChangeText={setField('fullName')} error={errors.fullName} autoCapitalize="words" placeholder="e.g. Joseph Tau" />
      <TextField
        label="Regimental number"
        required
        value={form.regimentalNumber}
        onChangeText={setField('regimentalNumber')}
        error={errors.regimentalNumber}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="e.g. 10452"
      />
      <ChipGroup label="Rank" required options={RANKS} value={form.rank} onChange={setField('rank')} error={errors.rank} />
      <TextField label="Station" required value={form.station} onChangeText={setField('station')} error={errors.station} placeholder="e.g. Boroko Police Station" />
      <TextField
        label="PIN"
        required
        hint="4 to 6 digits. Do not use your birth year or 1111."
        value={form.pin}
        onChangeText={setField('pin')}
        error={errors.pin}
        secureTextEntry
        keyboardType="number-pad"
        maxLength={6}
      />
      <TextField
        label="Confirm PIN"
        required
        value={form.confirmPin}
        onChangeText={setField('confirmPin')}
        error={errors.confirmPin}
        secureTextEntry
        keyboardType="number-pad"
        maxLength={6}
      />

      <AppButton title="Create account" icon="person-add-outline" onPress={onSubmit} loading={busy} />
    </Screen>
  );
}
