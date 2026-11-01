/**
 * Write or continue a notebook page.
 *
 * Two save actions:
 *  - "Save draft"          → stored, still editable, no page number yet.
 *  - "Save & close page"   → full validation, then the page is LOCKED,
 *                            given the next page number, and the form is
 *                            cleared for a fresh page.
 *
 * Photos picked here are kept in state as TEMPORARY uris (isNew: true) and
 * only copied into permanent storage when the page is saved, so cancelling
 * leaves no orphaned files behind.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import AppButton from '../components/AppButton';
import ChipGroup from '../components/ChipGroup';
import PhotoGrid from '../components/PhotoGrid';
import Screen from '../components/Screen';
import TextField from '../components/TextField';
import { Banner, LoadingView } from '../components/StateViews';
import { colors, radius, spacing, type } from '../components/theme';
import { useAuth } from '../services/AuthContext';
import { deletePhotoFile, persistPhoto, pickFromGallery, takePhoto } from '../services/photoService';
import { formatCoords, getCurrentCoords } from '../services/locationService';
import { deleteDraft, getPage, insertDraft, lockPage, updateDraft } from '../database/pageRepo';
import { deletePhoto, insertPhoto, listPhotos } from '../database/photoRepo';
import { INCIDENT_TYPES, MAX_PHOTOS_PER_PAGE } from '../utils/constants';
import { toDateString, toTimeString } from '../utils/dates';
import { emptyPage, isLocked, removeAt, updateField } from '../utils/pageHelpers';
import { hasErrors, validatePage } from '../utils/validation';

let tempKey = 0; // unique React keys for photos not yet in the database

export default function PageEditorScreen({ pageId: initialPageId = null }) {
  const db = useSQLiteContext();
  const { officer } = useAuth();

  const [pageId, setPageId] = useState(initialPageId);
  const [form, setForm] = useState(emptyPage);
  const [photos, setPhotos] = useState([]); // [{ key, id?, uri, isNew }]
  const [removed, setRemoved] = useState([]); // saved draft photos the officer removed
  const [errors, setErrors] = useState({});
  const [banner, setBannerState] = useState(null); // { kind, message }
  const scrollRef = useRef(null);
  // Messages appear at the top of a long form, so scroll up to show them.
  const setBanner = (value) => {
    setBannerState(value);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };
  const [loading, setLoading] = useState(Boolean(initialPageId));
  const [busy, setBusy] = useState(''); // '' | 'draft' | 'save' | 'gps' | 'photo'

  // ── Load an existing draft ───────────────────────────────────────────────
  useEffect(() => {
    if (!initialPageId) return;
    (async () => {
      const page = await getPage(db, officer.id, initialPageId);
      if (!page) {
        setBanner({ kind: 'error', message: 'Page not found.' });
      } else if (isLocked(page)) {
        router.replace(`/page/${page.id}`); // saved pages cannot be edited
        return;
      } else {
        const { id, officerId, status, pageNumber, createdAt, updatedAt, savedAt, photoCount, ...fields } = page;
        setForm(fields);
        const rows = await listPhotos(db, officer.id, id);
        setPhotos(rows.map((p) => ({ ...p, key: `db-${p.id}`, isNew: false })));
      }
      setLoading(false);
    })();
  }, [db, officer.id, initialPageId]);

  const setField = (field) => (value) => setForm((prev) => updateField(prev, field, value));

  const resetToBlankPage = useCallback(() => {
    setPageId(null);
    setForm(emptyPage());
    setPhotos([]);
    setRemoved([]);
    setErrors({});
  }, []);

  // ── Photos ───────────────────────────────────────────────────────────────
  const addPhotos = async (source) => {
    const room = MAX_PHOTOS_PER_PAGE - photos.length;
    if (room <= 0) return setBanner({ kind: 'error', message: `A page can have up to ${MAX_PHOTOS_PER_PAGE} photos.` });
    setBusy('photo');
    try {
      const uris = source === 'camera' ? await takePhoto() : await pickFromGallery(room);
      const added = uris.slice(0, room).map((uri) => ({ key: `tmp-${(tempKey += 1)}`, uri, isNew: true }));
      setPhotos((prev) => [...prev, ...added]); // immutable append
    } catch (e) {
      setBanner({ kind: 'error', message: e.message });
    } finally {
      setBusy('');
    }
  };

  const removePhoto = (index) => {
    const photo = photos[index];
    if (!photo.isNew) setRemoved((prev) => [...prev, photo]); // delete from DB on next save
    setPhotos((prev) => removeAt(prev, index));
  };

  // ── GPS ──────────────────────────────────────────────────────────────────
  const captureGps = async () => {
    setBusy('gps');
    const result = await getCurrentCoords();
    setBusy('');
    if (result.ok) {
      setForm((prev) => ({ ...prev, latitude: result.latitude, longitude: result.longitude }));
      setBanner({ kind: 'success', message: 'GPS position added.' });
    } else {
      setBanner({ kind: 'error', message: result.reason });
    }
  };

  // ── Saving ───────────────────────────────────────────────────────────────
  /**
   * Writes the draft and its photo changes. Files are copied FIRST, then all
   * database changes run in ONE transaction. If the transaction fails, the
   * copied files are deleted again so storage and database stay consistent.
   */
  const persistDraft = async () => {
    const newPhotos = photos.filter((p) => p.isNew);
    const copiedUris = [];
    try {
      for (const p of newPhotos) copiedUris.push(await persistPhoto(p.uri));
    } catch (e) {
      copiedUris.forEach(deletePhotoFile);
      throw new Error(`Could not store a photo: ${e.message}`);
    }

    let id = pageId;
    try {
      await db.withTransactionAsync(async () => {
        if (id) await updateDraft(db, officer.id, id, form);
        else id = await insertDraft(db, officer.id, form);
        for (const uri of copiedUris) await insertPhoto(db, id, uri);
        for (const r of removed) await deletePhoto(db, r.id, id);
      });
    } catch (e) {
      copiedUris.forEach(deletePhotoFile);
      if (!pageId) id = null;
      throw e;
    }
    removed.forEach((r) => deletePhotoFile(r.uri));

    // Refresh from the database so every photo now has its real id.
    const rows = await listPhotos(db, officer.id, id);
    setPhotos(rows.map((p) => ({ ...p, key: `db-${p.id}`, isNew: false })));
    setRemoved([]);
    setPageId(id);
    return id;
  };

  const onSaveDraft = async () => {
    const found = validatePage(form, { forSave: false });
    setErrors(found);
    if (hasErrors(found)) return setBanner({ kind: 'error', message: 'Please fix the highlighted fields.' });
    setBusy('draft');
    try {
      await persistDraft();
      setBanner({ kind: 'success', message: 'Draft saved. You can keep editing it later.' });
    } catch (e) {
      setBanner({ kind: 'error', message: e.message });
    } finally {
      setBusy('');
    }
  };

  const lockAndClear = async () => {
    setBusy('save');
    try {
      const id = await persistDraft();
      const pageNumber = await lockPage(db, officer.id, id);
      const message = `Page ${pageNumber} saved and locked. A new blank page is ready.`;
      if (initialPageId) {
        // Editing an older draft: close this screen and open the "New page" tab.
        Alert.alert('Page saved', message);
        router.dismissTo('/new');
        return;
      }
      resetToBlankPage();
      setBanner({ kind: 'success', message });
    } catch (e) {
      setBanner({ kind: 'error', message: e.message });
    } finally {
      setBusy('');
    }
  };

  const onSaveAndClose = () => {
    const found = validatePage(form, { forSave: true });
    setErrors(found);
    if (hasErrors(found)) return setBanner({ kind: 'error', message: 'This page is incomplete. Fix the highlighted fields before saving.' });
    Alert.alert(
      'Save and lock this page?',
      'A saved page can no longer be edited or deleted. Corrections can only be added as amendments.',
      [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Save & lock', onPress: lockAndClear },
      ],
    );
  };

  const onDiscard = () => {
    const isStored = Boolean(pageId);
    Alert.alert(
      isStored ? 'Delete this draft?' : 'Discard this page?',
      isStored ? 'The draft and its photos will be permanently deleted.' : 'Everything typed on this page will be cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isStored ? 'Delete draft' : 'Discard',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isStored) {
                const stored = await listPhotos(db, officer.id, pageId);
                if (!(await deleteDraft(db, officer.id, pageId))) throw new Error('Only drafts can be deleted.');
                stored.forEach((p) => deletePhotoFile(p.uri));
              }
              resetToBlankPage();
              setBanner({ kind: 'success', message: isStored ? 'Draft deleted.' : 'Page cleared.' });
              if (initialPageId) router.back();
            } catch (e) {
              setBanner({ kind: 'error', message: e.message });
            }
          },
        },
      ],
    );
  };

  if (loading) return <LoadingView message="Opening draft…" />;

  const coords = formatCoords(form.latitude, form.longitude);
  const isWorking = busy !== '';

  return (
    <Screen scrollRef={scrollRef}>
      <View style={styles.statusRow}>
        <Text style={styles.status}>{pageId ? 'Draft (not yet numbered)' : 'New page'}</Text>
        <Text style={type.small}>Officer: {officer.regimentalNumber}</Text>
      </View>

      <Banner kind={banner?.kind} message={banner?.message} />

      <TextField label="Incident title" required value={form.title} onChangeText={setField('title')} error={errors.title} placeholder="e.g. Stolen phone at Waigani bus stop" maxLength={120} />

      <View style={styles.row}>
        <TextField label="Date" required value={form.incidentDate} onChangeText={setField('incidentDate')} error={errors.incidentDate} placeholder="YYYY-MM-DD" maxLength={10} style={styles.flex} />
        <TextField label="Time" required value={form.incidentTime} onChangeText={setField('incidentTime')} error={errors.incidentTime} placeholder="HH:MM" maxLength={5} style={styles.time} />
      </View>
      <AppButton
        title="Set to now"
        variant="ghost"
        icon="time-outline"
        onPress={() => setForm((prev) => ({ ...prev, incidentDate: toDateString(), incidentTime: toTimeString() }))}
        style={styles.inlineBtn}
      />

      <TextField label="Location" required value={form.location} onChangeText={setField('location')} error={errors.location} placeholder="e.g. Gerehu Stage 4, near the market" />
      <View style={styles.gpsBox}>
        <Text style={type.small}>{coords ? `GPS: ${coords}` : 'No GPS position attached (optional).'}</Text>
        <View style={styles.row}>
          <AppButton title={coords ? 'Update GPS' : 'Add GPS'} variant="secondary" icon="navigate-outline" onPress={captureGps} loading={busy === 'gps'} disabled={isWorking} style={styles.flex} />
          {coords ? (
            <AppButton title="Remove" variant="ghost" onPress={() => setForm((prev) => ({ ...prev, latitude: null, longitude: null }))} />
          ) : null}
        </View>
      </View>

      <ChipGroup label="Incident type" required options={INCIDENT_TYPES} value={form.incidentType} onChange={setField('incidentType')} error={errors.incidentType} />

      <TextField label="People involved" value={form.peopleInvolved} onChangeText={setField('peopleInvolved')} multiline placeholder="Complainant, suspect, witnesses — names, descriptions, contacts" />
      <TextField label="Description" required value={form.description} onChangeText={setField('description')} error={errors.description} multiline placeholder="What happened, in order" />
      <TextField label="Action taken" required value={form.actionTaken} onChangeText={setField('actionTaken')} error={errors.actionTaken} multiline placeholder="Statements taken, arrests, referrals, advice given" />

      <Text style={[type.label, styles.photosTitle]}>
        Photos ({photos.length}/{MAX_PHOTOS_PER_PAGE})
      </Text>
      <PhotoGrid photos={photos} onRemove={removePhoto} />
      <View style={styles.row}>
        <AppButton title="Camera" variant="secondary" icon="camera-outline" onPress={() => addPhotos('camera')} disabled={isWorking} loading={busy === 'photo'} style={styles.flex} />
        <AppButton title="Gallery" variant="secondary" icon="images-outline" onPress={() => addPhotos('gallery')} disabled={isWorking} style={styles.flex} />
      </View>

      <View style={styles.actions}>
        <AppButton title="Save & close page" icon="lock-closed-outline" onPress={onSaveAndClose} loading={busy === 'save'} disabled={isWorking} accessibilityHint="Locks the page permanently and opens a new blank page" />
        <AppButton title="Save draft" variant="secondary" icon="save-outline" onPress={onSaveDraft} loading={busy === 'draft'} disabled={isWorking} />
        <AppButton title={pageId ? 'Delete draft' : 'Discard page'} variant="ghost" icon="trash-outline" onPress={onDiscard} disabled={isWorking} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  status: { fontWeight: '700', color: colors.warning, backgroundColor: colors.warningBg, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  flex: { flex: 1 },
  time: { width: 110 },
  inlineBtn: { alignSelf: 'flex-start', marginTop: -spacing.md, marginBottom: spacing.md },
  gpsBox: { marginTop: -spacing.sm, marginBottom: spacing.lg, gap: spacing.sm },
  photosTitle: { marginBottom: spacing.sm },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
});
