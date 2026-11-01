/**
 * Small views for the three "non-happy" states every list screen needs:
 * loading, empty, and a form-level error/notice banner.
 */
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, type } from './theme';

export function LoadingView({ message = 'Loading…' }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[type.small, styles.gap]}>{message}</Text>
    </View>
  );
}

export function EmptyState({ icon = 'document-text-outline', title, message, children }) {
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={56} color={colors.border} />
      <Text style={[type.heading, styles.gap]}>{title}</Text>
      {message ? <Text style={[type.small, styles.message]}>{message}</Text> : null}
      {children}
    </View>
  );
}

const BANNER = {
  error: { bg: colors.dangerBg, fg: colors.danger, icon: 'alert-circle' },
  success: { bg: colors.successBg, fg: colors.success, icon: 'checkmark-circle' },
  warning: { bg: colors.warningBg, fg: colors.warning, icon: 'lock-closed' },
};

export function Banner({ kind = 'error', message }) {
  if (!message) return null;
  const b = BANNER[kind];
  return (
    <View style={[styles.banner, { backgroundColor: b.bg }]} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Ionicons name={b.icon} size={20} color={b.fg} />
      <Text style={[styles.bannerText, { color: b.fg }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, minHeight: 240 },
  gap: { marginTop: spacing.md },
  message: { textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg },
  bannerText: { flex: 1, fontSize: 15, fontWeight: '600' },
});
