/**
 * Read a page. Saved pages are read-only; corrections are added as
 * amendments. Drafts show "Continue editing" and "Delete draft".
 */
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import AppButton from '../components/AppButton';
import PhotoGrid from '../components/PhotoGrid';
import Screen from '../components/Screen';
import TextField from '../components/TextField';
import { Banner, EmptyState, LoadingView } from '../components/StateViews';
import { colors, radius, spacing, type } from '../components/theme';
import { useAuth } from '../services/AuthContext';
import { formatCoords } from '../services/locationService';
import { sharePageAsPdf } from '../services/pdfService';
import { deletePhotoFile } from '../services/photoService';
import { insertAmendment, listAmendments } from '../database/amendmentRepo';
import { deleteDraft, getPage } from '../database/pageRepo';
import { listPhotos } from '../database/photoRepo';
import { formatDate, formatTimestamp } from '../utils/dates';
import { isLocked, pageLabel } from '../utils/pageHelpers';
import { hasErrors, validateAmendment } from '../utils/validation';

function Field({ label, value }) {
  return (
    <View style={styles.field} accessible accessibilityLabel={`${label}: ${value || 'not recorded'}`}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={type.body}>{value || '—'}</Text>
    </View>
  );
}

export default function PageDetailScreen({ pageId }) {
  const db = useSQLiteContext();
  const { officer } = useAuth();
  const [data, setData] = useState(null); // { page, photos, amendments }
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [banner, setBanner] = useState(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const page = await getPage(db, officer.id, pageId);
    if (!page) {
      setData(null);
    } else {
      // Promise.all runs the two independent queries at the same time.
      const [photos, amendments] = await Promise.all([listPhotos(db, officer.id, pageId), listAmendments(db, officer.id, pageId)]);
      setData({ page, photos, amendments });
    }
    setLoading(false);
  }, [db, officer.id, pageId]);

  useFocusEffect(
    useCallback(() => {
      load().catch((e) => {
        setBanner({ kind: 'error', message: e.message });
        setLoading(false);
      });
    }, [load]),
  );

  if (loading) return <LoadingView />;
  if (!data) return <EmptyState icon="alert-circle-outline" title="Page not found" message="It may have been deleted, or it belongs to another officer." />;

  const { page, photos, amendments } = data;
  const locked = isLocked(page);

  const addAmendment = async () => {
    const found = validateAmendment(note);
    setNoteError(found.note ?? '');
    if (hasErrors(found)) return;
    setBusy('amend');
    try {
      await insertAmendment(db, officer.id, page.id, note);
      setNote('');
      setBanner({ kind: 'success', message: 'Amendment added. The original entry is unchanged.' });
      await load();
    } catch (e) {
      setBanner({ kind: 'error', message: e.message });
    } finally {
      setBusy('');
    }
  };

  const share = async () => {
    setBusy('pdf');
    try {
      await sharePageAsPdf({ page, photos, amendments, officer });
    } catch (e) {
      setBanner({ kind: 'error', message: `PDF export failed: ${e.message}` });
    } finally {
      setBusy('');
    }
  };

  const confirmDelete = () =>
    Alert.alert('Delete this draft?', 'The draft and its photos will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete draft',
        style: 'destructive',
        onPress: async () => {
          try {
            if (!(await deleteDraft(db, officer.id, page.id))) throw new Error('Only drafts can be deleted.');
            photos.forEach((p) => deletePhotoFile(p.uri));
            router.back();
          } catch (e) {
            setBanner({ kind: 'error', message: e.message });
          }
        },
      },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: pageLabel(page) }} />
      <Banner kind={banner?.kind} message={banner?.message} />
      {locked ? (
        <Banner kind="warning" message={`Locked on ${formatTimestamp(page.savedAt)}. This page cannot be edited or deleted.`} />
      ) : (
        <Banner kind="warning" message="Draft — not yet saved to the notebook." />
      )}

      <Text style={[type.title, styles.title]}>{page.title}</Text>

      <View style={styles.card}>
        {page.serialNumber ? <Field label="Serial number" value={page.serialNumber} /> : null}
        <Field label="Date and time of incident" value={`${formatDate(page.incidentDate)} ${page.incidentTime}`.trim()} />
        <Field label="Location" value={page.location} />
        {page.latitude != null ? <Field label="GPS" value={formatCoords(page.latitude, page.longitude)} /> : null}
        <Field label="Incident type" value={page.incidentType} />
        <Field label="People involved" value={page.peopleInvolved} />
        <Field label="Description" value={page.description} />
        <Field label="Action taken" value={page.actionTaken} />
        <Field label="Recorded by" value={`${officer.rank} ${officer.fullName} (${officer.regimentalNumber})`} />
        <Field label="Page created" value={formatTimestamp(page.createdAt)} />
      </View>

      <Text style={[type.heading, styles.section]}>Photos ({photos.length})</Text>
      <PhotoGrid photos={photos} />

      {locked ? (
        <>
          <Text style={[type.heading, styles.section]}>Amendments ({amendments.length})</Text>
          {amendments.length === 0 ? <Text style={[type.small, styles.gap]}>No amendments.</Text> : null}
          {amendments.map((a) => (
            <View key={a.id} style={styles.amendment}>
              <Text style={styles.amendMeta}>
                {formatTimestamp(a.createdAt)} · {a.author}
              </Text>
              <Text style={type.body}>{a.note}</Text>
            </View>
          ))}
          <TextField label="Add an amendment" value={note} onChangeText={setNote} error={noteError} multiline hint="Write the correction or additional detail. The original text stays as it is." />
          <AppButton title="Add amendment" icon="add-circle-outline" variant="secondary" onPress={addAmendment} loading={busy === 'amend'} disabled={busy !== ''} />
          <AppButton title="Share as PDF" icon="share-outline" onPress={share} loading={busy === 'pdf'} disabled={busy !== ''} style={styles.gapTop} />
        </>
      ) : (
        <View style={styles.gapTop}>
          <AppButton title="Continue editing" icon="create-outline" onPress={() => router.push(`/edit/${page.id}`)} />
          <AppButton title="Delete draft" icon="trash-outline" variant="ghost" onPress={confirmDelete} style={styles.gapTop} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  field: { marginBottom: spacing.md },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 2 },
  section: { marginTop: spacing.xl, marginBottom: spacing.md },
  amendment: { borderLeftWidth: 4, borderLeftColor: colors.accent, backgroundColor: colors.warningBg, padding: spacing.md, borderRadius: radius.sm, marginBottom: spacing.md },
  amendMeta: { fontSize: 13, fontWeight: '700', color: colors.warning, marginBottom: 4 },
  gap: { marginBottom: spacing.md },
  gapTop: { marginTop: spacing.md },
});
