/**
 * Amendments: append-only corrections to a SAVED page.
 * There is deliberately no update or delete function here.
 */
import { toTimestamp } from '../utils/dates.ts';
import type { Amendment, Db } from '../types.ts';

interface AmendmentRow {
  id: number;
  note: string;
  created_at: string;
  full_name: string;
  rank: string;
}

export const listAmendments = async (db: Db, officerId: number, pageId: number): Promise<Amendment[]> => {
  const rows = await db.getAllAsync<AmendmentRow>(
    `SELECT a.id, a.note, a.created_at, o.full_name, o.rank
     FROM amendments a
     JOIN pages p ON p.id = a.page_id
     JOIN officers o ON o.id = a.officer_id
     WHERE a.page_id = ? AND p.officer_id = ?
     ORDER BY a.id`,
    [pageId, officerId],
  );
  return rows.map(({ id, note, created_at, full_name, rank }) => ({
    id,
    note,
    createdAt: created_at,
    author: `${rank} ${full_name}`,
  }));
};

/** Amendments are only allowed on saved pages that belong to this officer. */
export const insertAmendment = async (db: Db, officerId: number, pageId: number, note: string): Promise<void> => {
  const result = await db.runAsync(
    `INSERT INTO amendments (page_id, officer_id, note, created_at)
     SELECT id, ?, ?, ? FROM pages WHERE id = ? AND officer_id = ? AND status = 'saved'`,
    [officerId, note.trim(), toTimestamp(), pageId, officerId],
  );
  if (result.changes !== 1) throw new Error('Amendments can only be added to your own saved pages.');
};
