/**
 * Notebook page data access.
 *
 * Ownership rule: EVERY query includes "officer_id = ?" so an officer can
 * only ever read or change their own pages, even if a page id is guessed.
 */
import { buildPageQuery } from '../utils/pageQuery.js';
import { rowToPage } from '../utils/pageHelpers.js';
import { toTimestamp } from '../utils/dates.js';

/** Field order shared by INSERT and UPDATE so they cannot drift apart. */
const pageValues = (p) => [
  p.title.trim(),
  p.incidentDate || null,
  p.incidentTime || null,
  p.location?.trim() || null,
  p.latitude ?? null,
  p.longitude ?? null,
  p.incidentType || null,
  p.peopleInvolved?.trim() || null,
  p.description?.trim() || null,
  p.actionTaken?.trim() || null,
];

export const listPages = async (db, officerId, filters) => {
  const { sql, params } = buildPageQuery(officerId, filters);
  const rows = await db.getAllAsync(sql, params);
  return rows.map(rowToPage); // map: database rows -> app objects
};

export const getPage = async (db, officerId, pageId) => {
  const row = await db.getFirstAsync(
    `SELECT p.*, o.regimental_number, (SELECT COUNT(*) FROM photos WHERE page_id = p.id) AS photo_count
     FROM pages p JOIN officers o ON o.id = p.officer_id
     WHERE p.id = ? AND p.officer_id = ?`,
    [pageId, officerId],
  );
  return row ? rowToPage(row) : null;
};

export const insertDraft = async (db, officerId, page) => {
  const now = toTimestamp();
  const result = await db.runAsync(
    `INSERT INTO pages
       (title, incident_date, incident_time, location, latitude, longitude, incident_type,
        people_involved, description, action_taken, officer_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
    [...pageValues(page), officerId, now, now],
  );
  return result.lastInsertRowId;
};

export const updateDraft = async (db, officerId, pageId, page) => {
  const result = await db.runAsync(
    `UPDATE pages SET
       title = ?, incident_date = ?, incident_time = ?, location = ?, latitude = ?, longitude = ?,
       incident_type = ?, people_involved = ?, description = ?, action_taken = ?, updated_at = ?
     WHERE id = ? AND officer_id = ? AND status = 'draft'`,
    [...pageValues(page), toTimestamp(), pageId, officerId],
  );
  if (result.changes !== 1) throw new Error('This page could not be updated. It may already be saved.');
};

/**
 * Lock a draft. The page number is assigned HERE, inside one UPDATE
 * statement, as (highest page number for this officer) + 1.
 *
 * Why number on save instead of on creation?  Drafts can be deleted. If
 * drafts took numbers, deleting one would leave a gap (page 7, 9, 10…) which
 * looks like a page was removed. Numbering only locked pages keeps the
 * sequence continuous, like a bound paper notebook.
 */
export const lockPage = async (db, officerId, pageId) => {
  const now = toTimestamp();
  const result = await db.runAsync(
    `UPDATE pages SET
       status = 'saved',
       page_number = (SELECT COALESCE(MAX(page_number), 0) + 1 FROM pages WHERE officer_id = ?),
       saved_at = ?, updated_at = ?
     WHERE id = ? AND officer_id = ? AND status = 'draft'`,
    [officerId, now, now, pageId, officerId],
  );
  if (result.changes !== 1) throw new Error('This page could not be saved. It may already be locked.');
  const { page_number } = await db.getFirstAsync('SELECT page_number FROM pages WHERE id = ?', [pageId]);
  return page_number;
};

/** Only drafts can be deleted (also enforced by a database trigger). */
export const deleteDraft = async (db, officerId, pageId) => {
  const result = await db.runAsync("DELETE FROM pages WHERE id = ? AND officer_id = ? AND status = 'draft'", [
    pageId,
    officerId,
  ]);
  return result.changes === 1;
};
