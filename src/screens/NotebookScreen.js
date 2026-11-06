/**
 * The notebook: every page for the signed-in officer, newest first, with
 * keyword search and filters. Filtering is done in SQL (see
 * utils/pageQuery.js) so it stays fast even with thousands of pages.
 */
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../components/AppButton';
import ChipGroup from '../components/ChipGroup';
import PageCard from '../components/PageCard';
import TextField from '../components/TextField';
import { Banner, EmptyState, LoadingView } from '../components/StateViews';
import { colors, CONTENT_MAX_WIDTH, MIN_TOUCH, radius, spacing, type } from '../components/theme';
import { useAuth } from '../services/AuthContext';
import { listPages } from '../database/pageRepo';
import { INCIDENT_TYPES, PAGE_STATUS } from '../utils/constants';
import { isValidDate } from '../utils/dates';

const NO_FILTERS = { keyword: '', incidentType: '', status: '', fromDate: '', toDate: '' };
const STATUS_OPTIONS = [
  { value: PAGE_STATUS.DRAFT, label: 'Draft' },
  { value: PAGE_STATUS.SAVED, label: 'Saved' },
];

/** Only pass dates to the query once they are complete and valid. */
const usableFilters = (f) => ({
  ...f,
  fromDate: isValidDate(f.fromDate) ? f.fromDate : '',
  toDate: isValidDate(f.toDate) ? f.toDate : '',
});

export default function NotebookScreen() {
  const db = useSQLiteContext();
  const { officer } = useAuth();
  const [filters, setFilters] = useState(NO_FILTERS);
  const [debounced, setDebounced] = useState(NO_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [pages, setPages] = useState(null);
  const [error, setError] = useState('');

  // Debounce: wait 300 ms after the officer stops typing before querying.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(usableFilters(filters)), 300);
    return () => clearTimeout(t);
  }, [filters]);

  const load = useCallback(async () => {
    try {
      setError('');
      setPages(await listPages(db, officer.id, debounced));
    } catch (e) {
      setError(e.message);
    }
  }, [db, officer.id, debounced]);

  // Reload whenever the screen gains focus or the filters change.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const setFilter = (field) => (value) => setFilters((prev) => ({ ...prev, [field]: value }));
  const activeCount = ['incidentType', 'status', 'fromDate', 'toDate'].filter((k) => filters[k]).length;

  const dateError = (v) => (v && !isValidDate(v) ? 'Use YYYY-MM-DD' : undefined);

  const header = (
    <View>
      <View style={styles.searchRow}>
        <TextField
          label="Search"
          value={filters.keyword}
          onChangeText={setFilter('keyword')}
          placeholder="Title, place, person, or page no."
          style={styles.flex}
          returnKeyType="search"
          autoCorrect={false}
        />
        <Pressable
          onPress={() => setShowFilters((s) => !s)}
          accessibilityRole="button"
          accessibilityLabel={`${showFilters ? 'Hide' : 'Show'} filters${activeCount ? `, ${activeCount} active` : ''}`}
          style={[styles.filterBtn, activeCount > 0 && styles.filterBtnActive]}
        >
          <Ionicons name="options-outline" size={24} color={activeCount ? '#fff' : colors.brandRed} />
          {activeCount ? <Text style={styles.filterCount}>{activeCount}</Text> : null}
        </Pressable>
      </View>

      {showFilters ? (
        <View style={styles.filters}>
          <ChipGroup label="Incident type" options={INCIDENT_TYPES} value={filters.incidentType} onChange={setFilter('incidentType')} allowClear />
          <ChipGroup label="Status" options={STATUS_OPTIONS} value={filters.status} onChange={setFilter('status')} allowClear />
          <View style={styles.dateRow}>
            <TextField label="From date" value={filters.fromDate} onChangeText={setFilter('fromDate')} placeholder="YYYY-MM-DD" error={dateError(filters.fromDate)} style={styles.flex} maxLength={10} />
            <TextField label="To date" value={filters.toDate} onChangeText={setFilter('toDate')} placeholder="YYYY-MM-DD" error={dateError(filters.toDate)} style={styles.flex} maxLength={10} />
          </View>
          <AppButton title="Clear all filters" variant="ghost" onPress={() => setFilters(NO_FILTERS)} />
        </View>
      ) : null}

      <Banner message={error} />
      {pages ? (
        <Text style={[type.small, styles.count]}>
          {pages.length} page{pages.length === 1 ? '' : 's'}
        </Text>
      ) : null}
    </View>
  );

  const anyFilter = activeCount > 0 || filters.keyword.trim();

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={pages ?? []}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <PageCard page={item} onPress={() => router.push(`/page/${item.id}`)} />}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={
        pages === null ? (
          <LoadingView />
        ) : anyFilter ? (
          <EmptyState icon="search-outline" title="No matching pages" message="Try a different search word or clear the filters." />
        ) : (
          <EmptyState title="No pages yet" message="Pages you write will appear here.">
            <AppButton title="Write the first page" icon="add" onPress={() => router.navigate('/new')} />
          </EmptyState>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  searchRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  flex: { flex: 1 },
  filterBtn: {
    width: MIN_TOUCH + 4,
    height: MIN_TOUCH + 4,
    marginBottom: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.brandRed,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  filterBtnActive: { backgroundColor: colors.brandRed },
  filterCount: { position: 'absolute', top: 2, right: 6, color: '#fff', fontWeight: '800', fontSize: 12 },
  filters: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  dateRow: { flexDirection: 'row', gap: spacing.sm },
  count: { marginBottom: spacing.sm },
});
