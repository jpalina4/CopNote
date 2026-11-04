/**
 * Photo rows. Each row stores the path of an image file in the app's own
 * document folder (see services/photoService.js), not the image itself.
 */
import { toTimestamp } from '../utils/dates.ts';
import type { Db, Photo } from '../types.ts';

interface PhotoRow {
  id: number;
  file_uri: string;
  created_at: string;
}

/** Joined to pages so an officer cannot read another officer's photos. */
export const listPhotos = async (db: Db, officerId: number, pageId: number): Promise<Photo[]> => {
  const rows = await db.getAllAsync<PhotoRow>(
    `SELECT ph.id, ph.file_uri, ph.created_at
     FROM photos ph JOIN pages p ON p.id = ph.page_id
     WHERE ph.page_id = ? AND p.officer_id = ?
     ORDER BY ph.id`,
    [pageId, officerId],
  );
  return rows.map(({ id, file_uri, created_at }) => ({ id, uri: file_uri, createdAt: created_at }));
};

export const insertPhoto = (db: Db, pageId: number, fileUri: string) =>
  db.runAsync('INSERT INTO photos (page_id, file_uri, created_at) VALUES (?, ?, ?)', [
    pageId,
    fileUri,
    toTimestamp(),
  ]);

export const deletePhoto = (db: Db, photoId: number, pageId: number) =>
  db.runAsync('DELETE FROM photos WHERE id = ? AND page_id = ?', [photoId, pageId]);
