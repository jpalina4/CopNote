/**
 * A row of selectable "chips" — a touch-friendly replacement for a dropdown.
 * Behaves like radio buttons: one value selected; tap again to clear when
 * `allowClear` is set (used by filters).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, MIN_TOUCH, radius, spacing, type } from './theme';

export type ChipOption = string | { value: string; label: string };

interface ChipGroupProps {
  label?: string;
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  allowClear?: boolean;
  required?: boolean;
}

export default function ChipGroup({ label, options, value, onChange, error, allowClear = false, required = false }: ChipGroupProps) {
  return (
    <View style={styles.wrapper} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {label ? (
        <Text style={type.label}>
          {label}
          {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
        </Text>
      ) : null}
      <View style={styles.row}>
        {options.map((option) => {
          // Options can be plain strings or { value, label } objects.
          const { value: optionValue, label: optionLabel } = typeof option === 'string' ? { value: option, label: option } : option;
          const selected = optionValue === value;
          return (
            <Pressable
              key={optionValue}
              onPress={() => onChange(selected && allowClear ? '' : optionValue)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={optionLabel}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{optionLabel}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
  row: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs, gap: spacing.sm },
  chip: {
    minHeight: MIN_TOUCH - 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 15, color: colors.text },
  chipTextSelected: { color: '#fff', fontWeight: '700' },
  error: { color: colors.danger, marginTop: spacing.xs, fontSize: 14, fontWeight: '600' },
});
