/** One row in the notebook list. Receives a page object as a prop. */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '../utils/dates';
import { isLocked, pageLabel } from '../utils/pageHelpers';
import { colors, radius, spacing, type } from './theme';
import type { Page } from '../types';

export default function PageCard({ page, onPress }: { page: Page; onPress: () => void }) {
  const locked = isLocked(page);
  const { title, incidentType, incidentDate, incidentTime, photoCount, location, serialNumber } = page; // destructuring
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${pageLabel(page)}${serialNumber ? `, serial ${serialNumber}` : ''}, ${title}, ${incidentType || 'no type'}, ${formatDate(incidentDate)}, ${photoCount} photos${locked ? ', locked' : ', draft'}`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.header}>
        <View style={[styles.badge, locked ? styles.badgeSaved : styles.badgeDraft]}>
          <Ionicons name={locked ? 'lock-closed' : 'create-outline'} size={14} color={locked ? colors.success : colors.warning} />
          <Text style={[styles.badgeText, { color: locked ? colors.success : colors.warning }]}>{pageLabel(page)}</Text>
        </View>
        <Text style={type.small}>
          {formatDate(incidentDate)} {incidentTime}
        </Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {serialNumber ? <Text style={styles.serial}>No. {serialNumber}</Text> : null}
      {location ? (
        <Text style={type.small} numberOfLines={1}>
          {location}
        </Text>
      ) : null}
      <View style={styles.footer}>
        <Text style={styles.type}>{incidentType || 'Type not set'}</Text>
        <View style={styles.photos}>
          <Ionicons name="camera-outline" size={16} color={colors.textMuted} />
          <Text style={type.small}>{photoCount}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgeSaved: { backgroundColor: colors.successBg },
  badgeDraft: { backgroundColor: colors.warningBg },
  badgeText: { fontSize: 13, fontWeight: '700' },
  title: { ...type.body, fontWeight: '700', marginBottom: 2 },
  serial: { fontSize: 12, fontWeight: '600', color: colors.textMuted, fontVariant: ['tabular-nums'], marginBottom: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  type: { fontSize: 13, fontWeight: '600', color: colors.primary },
  photos: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
