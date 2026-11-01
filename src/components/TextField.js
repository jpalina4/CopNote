/**
 * Labelled text input with an error message underneath.
 *
 * Props pattern: anything we do not use ourselves (`...inputProps`) is passed
 * straight to <TextInput>, so callers can still set keyboardType, maxLength,
 * secureTextEntry, etc.
 */
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useOptionalAuth } from '../services/AuthContext';
import { colors, MIN_TOUCH, radius, spacing, type } from './theme';

export default function TextField({ label, error, hint, multiline = false, onChangeText, style, required = false, ...inputProps }) {
  const auth = useOptionalAuth();
  return (
    <View style={[styles.wrapper, style]}>
      <Text style={type.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {hint ? <Text style={[type.small, styles.hint]}>{hint}</Text> : null}
      <TextInput
        {...inputProps}
        multiline={multiline}
        onChangeText={(text) => {
          auth?.reportActivity(); // typing counts as activity for the inactivity lock
          onChangeText?.(text);
        }}
        accessibilityLabel={label}
        accessibilityHint={error || hint}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, multiline && styles.multiline, error && styles.inputError]}
      />
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
  required: { color: colors.danger },
  hint: { marginTop: 2 },
  input: {
    minHeight: MIN_TOUCH,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    fontSize: 16,
    color: colors.text,
  },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
  error: { color: colors.danger, marginTop: spacing.xs, fontSize: 14, fontWeight: '600' },
});
