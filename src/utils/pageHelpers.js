/**
 * Pure helpers for working with page data (no React, no database).
 *
 * They show functional-programming ideas used throughout the app:
 *  - map:    transform each item (database row -> JavaScript object)
 *  - filter: keep only some items
 *  - reduce: fold a list into one value (a summary of counts)
 *  - immutable updates: return NEW objects/arrays rather than changing old ones
 */
import { INCIDENT_TYPES, PAGE_STATUS } from './constants.js';
import { toDateString, toTimeString } from './dates.js';

/** SQLite columns use snake_case; JavaScript prefers camelCase. */
export const rowToPage = (row) => ({
  id: row.id,
  officerId: row.officer_id,
  pageNumber: row.page_number,
  title: row.title,
  incidentDate: row.incident_date ?? '',
  incidentTime: row.incident_time ?? '',
  location: row.location ?? '',
  latitude: row.latitude,
  longitude: row.longitude,
  incidentType: row.incident_type ?? '',
  peopleInvolved: row.people_involved ?? '',
  description: row.description ?? '',
  actionTaken: row.action_taken ?? '',
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  savedAt: row.saved_at,
  photoCount: row.photo_count ?? 0,
});

/** A fresh, blank notebook page. The date and time default to "now". */
export const emptyPage = (now = new Date()) => ({
  title: '',
  incidentDate: toDateString(now),
  incidentTime: toTimeString(now),
  location: '',
  latitude: null,
  longitude: null,
  incidentType: '',
  peopleInvolved: '',
  description: '',
  actionTaken: '',
});

/** Immutable update: returns a NEW page object with one field changed. */
export const updateField = (page, field, value) => ({ ...page, [field]: value });

/** Immutable removal from an array — the original array is untouched. */
export const removeAt = (items, index) => items.filter((_, i) => i !== index);

export const isLocked = (page) => page?.status === PAGE_STATUS.SAVED;

/** "Page 12" for saved pages, "Draft" for drafts (drafts get a number only when saved). */
export const pageLabel = (page) => (page.pageNumber ? `Page ${page.pageNumber}` : 'Draft');

/**
 * Dashboard summary built with reduce.
 * Starts with every incident type at zero so the chart always shows all types.
 */
export const summarisePages = (pages, today = toDateString()) =>
  pages.reduce(
    (acc, page) => ({
      total: acc.total + 1,
      saved: acc.saved + (page.status === PAGE_STATUS.SAVED ? 1 : 0),
      drafts: acc.drafts + (page.status === PAGE_STATUS.DRAFT ? 1 : 0),
      today: acc.today + (page.createdAt?.startsWith(today) ? 1 : 0),
      byType: page.incidentType
        ? { ...acc.byType, [page.incidentType]: (acc.byType[page.incidentType] ?? 0) + 1 }
        : acc.byType,
    }),
    {
      total: 0,
      saved: 0,
      drafts: 0,
      today: 0,
      byType: Object.fromEntries(INCIDENT_TYPES.map((t) => [t, 0])),
    },
  );

/** Escape text before inserting it into HTML for the PDF export. */
export const escapeHtml = (text = '') =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br/>');
