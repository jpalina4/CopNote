/**
 * Dashboard: today's entries, total pages, drafts, and a breakdown by type.
 * The numbers come from summarisePages(), a pure reduce over the page list.
 */
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import AppButton from '../components/AppButton';
import PageCard from '../components/PageCard';
import Screen from '../components/Screen';
import { Banner, EmptyState, LoadingView } from '../components/StateViews';
import { colors, radius, spacing, type } from '../components/theme';
import { useAuth } from '../services/AuthContext';
import { listPages } from '../database/pageRepo';
import { formatDate, toDateString } from '../utils/dates';
import { summarisePages } from '../utils/pageHelpers';

function StatCard({ label, value, tone = colors.primary }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const db = useSQLiteContext();
  const { officer, logout, lockNow } = useAuth();
  const [pages, setPages] = useState(null); // null = still loading
  const [error, setError] = useState('');

  // useFocusEffect re-runs each time this tab is shown, so the numbers are
  // fresh after saving a page on another tab.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      listPages(db, officer.id)
        .then((rows) => active && setPages(rows))
        .catch((e) => active && setError(e.message));
      return () => {
        active = false;
      };
    }, [db, officer.id]),
  );

  const confirmLogout = () =>
    Alert.alert('Log out?', 'Unsaved changes on an open page will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);

  if (error) return <Screen><Banner message={error} /></Screen>;
  if (!pages) return <LoadingView message="Opening notebook…" />;

  const { today, saved, drafts, byType } = summarisePages(pages);
  // Object.entries + filter + sort: only show types that have pages, largest first.
  const typeRows = Object.entries(byType)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);
  const maxCount = Math.max(1, ...typeRows.map(([, c]) => c));
  const recent = pages.slice(0, 3);

  return (
    <Screen>
      <Text style={type.small}>{formatDate(toDateString())}</Text>
      <Text style={type.title}>
        Welcome, {officer.rank} {officer.fullName.split(' ')[0]}
      </Text>
      <Text style={[type.small, { marginBottom: spacing.lg }]}>
        Reg. no. {officer.regimentalNumber} · {officer.station}
      </Text>

      <View style={styles.stats}>
        <StatCard label="Today's entries" value={today} />
        <StatCard label="Saved pages" value={saved} tone={colors.success} />
        <StatCard label="Drafts" value={drafts} tone={colors.warning} />
      </View>

      <AppButton title="Start a new page" icon="add-circle-outline" onPress={() => router.navigate('/new')} />

      <Text style={[type.heading, styles.section]}>Incidents by type</Text>
      {typeRows.length === 0 ? (
        <Text style={type.small}>No incidents recorded yet.</Text>
      ) : (
        typeRows.map(([name, count]) => (
          <View key={name} style={styles.barRow} accessible accessibilityLabel={`${name}: ${count}`}>
            <Text style={styles.barLabel}>{name}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${(count / maxCount) * 100}%` }]} />
            </View>
            <Text style={styles.barCount}>{count}</Text>
          </View>
        ))
      )}

      <Text style={[type.heading, styles.section]}>Recent pages</Text>
      {recent.length === 0 ? (
        <EmptyState title="Your notebook is empty" message="Tap “Start a new page” to record your first incident." />
      ) : (
        recent.map((page) => <PageCard key={page.id} page={page} onPress={() => router.push(`/page/${page.id}`)} />)
      )}

      <View style={styles.actions}>
        <AppButton title="Lock now" variant="secondary" icon="lock-closed-outline" onPress={lockNow} style={styles.flex} />
        <AppButton title="Log out" variant="secondary" icon="log-out-outline" onPress={confirmLogout} style={styles.flex} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { ...type.small, textAlign: 'center' },
  section: { marginTop: spacing.xl, marginBottom: spacing.md },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  barLabel: { width: 130, fontSize: 14, color: colors.text },
  barTrack: { flex: 1, height: 14, backgroundColor: colors.border, borderRadius: 7, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.primary },
  barCount: { width: 32, textAlign: 'right', fontWeight: '700', color: colors.text },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  flex: { flex: 1 },
});
