/**
 * Database tests: run the REAL schema SQL and repository functions against
 * Node's built-in SQLite (node:sqlite), using a tiny adapter that mimics the
 * expo-sqlite async API (runAsync, getFirstAsync, getAllAsync, execAsync).
 * This checks the SQL, foreign keys and integrity triggers without a phone.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_V1 } from '../src/database/schemaSql.js';
import { insertOfficer } from '../src/database/officerRepo.js';
import { insertDraft, updateDraft, lockPage, deleteDraft, getPage, listPages } from '../src/database/pageRepo.js';
import { insertPhoto, deletePhoto, listPhotos } from '../src/database/photoRepo.js';
import { insertAmendment, listAmendments } from '../src/database/amendmentRepo.js';

/** Minimal expo-sqlite look-alike. */
function makeDb() {
  const raw = new DatabaseSync(':memory:');
  const db = {
    execAsync: async (sql) => raw.exec(sql),
    runAsync: async (sql, params = []) => {
      const r = raw.prepare(sql).run(...params);
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    withTransactionAsync: async (task) => {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return db;
}

const officer = (regimentalNumber) => ({
  fullName: 'Test Officer', regimentalNumber, rank: 'Constable', station: 'Waigani',
  pinHash: 'x', pinSalt: 'y', pinIterations: 1, createdAt: '2026-11-01 08:00:00',
});

const completePage = {
  title: 'Stolen bilum at Waigani', incidentDate: '2026-11-01', incidentTime: '09:30',
  location: 'Waigani bus stop', incidentType: 'Theft', peopleInvolved: 'Complainant',
  description: 'Bilum taken from bench while complainant waited.', actionTaken: 'Statement taken.',
};

async function setup() {
  const db = makeDb();
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(SCHEMA_V1);
  const a = await insertOfficer(db, officer('10001'));
  const b = await insertOfficer(db, officer('10002'));
  return { db, a, b };
}

test('regimental numbers are unique', async () => {
  const { db } = await setup();
  await assert.rejects(insertOfficer(db, officer('10001')), /UNIQUE/);
});

test('draft -> edit -> lock assigns sequential page numbers', async () => {
  const { db, a } = await setup();
  const p1 = await insertDraft(db, a, completePage);
  const p2 = await insertDraft(db, a, { ...completePage, title: 'Second page' });
  await updateDraft(db, a, p1, { ...completePage, title: 'Edited title' });
  assert.equal((await getPage(db, a, p1)).title, 'Edited title');
  assert.equal((await getPage(db, a, p1)).pageNumber, null); // drafts are unnumbered

  assert.equal(await lockPage(db, a, p2), 1);
  assert.equal(await lockPage(db, a, p1), 2);
  const page = await getPage(db, a, p1);
  assert.equal(page.status, 'saved');
  assert.ok(page.savedAt);
});

test('saved pages get a serial number that is unique across officers and searchable', async () => {
  const { db, a, b } = await setup();
  const draft = await insertDraft(db, a, completePage);
  assert.equal((await getPage(db, a, draft)).serialNumber, null); // drafts have no serial
  await lockPage(db, a, draft);
  const other = await insertDraft(db, b, completePage);
  await lockPage(db, b, other);

  // Both are "Page 1", but their serials differ.
  assert.equal((await getPage(db, a, draft)).serialNumber, '10001-000001');
  assert.equal((await getPage(db, b, other)).serialNumber, '10002-000001');

  const found = await listPages(db, a, { keyword: '10001-000001' });
  assert.deepEqual(found.map((p) => p.serialNumber), ['10001-000001']);
  assert.equal((await listPages(db, a, { keyword: '10002-000001' })).length, 0); // another officer's serial
  assert.equal((await listPages(db, a, { keyword: '10001-000000' })).length, 0); // drafts never match
});

test('saved pages cannot be updated, deleted, or have photos changed', async () => {
  const { db, a } = await setup();
  const id = await insertDraft(db, a, completePage);
  await insertPhoto(db, id, 'file:///photos/1.jpg');
  const [photo] = await listPhotos(db, a, id);
  await lockPage(db, a, id);

  // The repository refuses (WHERE status = 'draft')…
  await assert.rejects(updateDraft(db, a, id, { ...completePage, title: 'tamper' }), /could not be updated/);
  assert.equal(await deleteDraft(db, a, id), false);
  await assert.rejects(lockPage(db, a, id), /could not be saved/);
  // …and the triggers refuse even raw SQL that bypasses the repository.
  await assert.rejects(db.runAsync("UPDATE pages SET title = 'tamper' WHERE id = ?", [id]), /read-only/);
  await assert.rejects(db.runAsync('DELETE FROM pages WHERE id = ?', [id]), /cannot be deleted/);
  await assert.rejects(insertPhoto(db, id, 'file:///photos/2.jpg'), /cannot be added/);
  await assert.rejects(deletePhoto(db, photo.id, id), /cannot be removed/);
});

test('amendments only on saved pages, append-only', async () => {
  const { db, a } = await setup();
  const id = await insertDraft(db, a, completePage);
  await assert.rejects(insertAmendment(db, a, id, 'Too early for this'), /only be added/);
  await lockPage(db, a, id);
  await insertAmendment(db, a, id, 'Witness name corrected.');
  const list = await listAmendments(db, a, id);
  assert.equal(list.length, 1);
  assert.equal(list[0].author, 'Constable Test Officer');
  await assert.rejects(db.runAsync("UPDATE amendments SET note = 'x'"), /cannot be changed/);
});

test('officers can only see and change their own pages', async () => {
  const { db, a, b } = await setup();
  const id = await insertDraft(db, a, completePage);
  assert.equal(await getPage(db, b, id), null);
  assert.equal((await listPages(db, b)).length, 0);
  assert.equal(await deleteDraft(db, b, id), false);
  await assert.rejects(updateDraft(db, b, id, completePage));
  await assert.rejects(lockPage(db, b, id));
  await assert.rejects(insertAmendment(db, b, id, 'Not my page at all'));
});

test('deleting a draft cascades to its photos', async () => {
  const { db, a } = await setup();
  const id = await insertDraft(db, a, completePage);
  await insertPhoto(db, id, 'file:///photos/1.jpg');
  assert.equal(await deleteDraft(db, a, id), true);
  const { n } = await db.getFirstAsync('SELECT COUNT(*) AS n FROM photos');
  assert.equal(n, 0);
});

test('search and filters', async () => {
  const { db, a } = await setup();
  const t = await insertDraft(db, a, completePage);
  await insertDraft(db, a, { ...completePage, title: 'Crash on Hubert Murray Hwy', incidentType: 'Traffic accident', incidentDate: '2026-10-15', location: 'Konedobu' });
  await lockPage(db, a, t);
  await insertPhoto(db, (await insertDraft(db, a, { title: 'Draft with photo' })), 'file:///p.jpg');

  assert.equal((await listPages(db, a)).length, 3);
  assert.equal((await listPages(db, a, { keyword: 'konedobu' })).length, 1); // LIKE is case-insensitive
  assert.equal((await listPages(db, a, { keyword: '1' })).length, 1); // page number search
  assert.equal((await listPages(db, a, { incidentType: 'Theft' })).length, 1);
  assert.equal((await listPages(db, a, { status: 'draft' })).length, 2);
  assert.equal((await listPages(db, a, { fromDate: '2026-10-01', toDate: '2026-10-31' })).length, 1);
  assert.equal((await listPages(db, a, { keyword: "'; DROP TABLE pages; --" })).length, 0);
  const withPhoto = (await listPages(db, a)).find((p) => p.title === 'Draft with photo');
  assert.equal(withPhoto.photoCount, 1);
});
