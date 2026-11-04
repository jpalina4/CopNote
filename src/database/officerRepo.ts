/**
 * Officer data access ("repository").
 *
 * Every query uses "?" placeholders with a separate values array. SQLite
 * binds the values safely, so names or numbers typed by a user can never
 * change the meaning of the SQL.
 */
import type { Db, NewOfficer, Officer, OfficerRow } from '../types.ts';

export const findOfficerByRegimentalNumber = (db: Db, regimentalNumber: string) =>
  db.getFirstAsync<OfficerRow>('SELECT * FROM officers WHERE regimental_number = ?', [regimentalNumber]);

export const findOfficerById = (db: Db, id: number) => db.getFirstAsync<OfficerRow>('SELECT * FROM officers WHERE id = ?', [id]);

export const insertOfficer = async (db: Db, officer: NewOfficer): Promise<number> => {
  const { fullName, regimentalNumber, rank, station, pinHash, pinSalt, pinIterations, createdAt } = officer;
  const result = await db.runAsync(
    `INSERT INTO officers
       (full_name, regimental_number, rank, station, pin_hash, pin_salt, pin_iterations, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [fullName, regimentalNumber, rank, station, pinHash, pinSalt, pinIterations, createdAt],
  );
  return result.lastInsertRowId;
};

export const recordFailedAttempt = (db: Db, id: number, failedAttempts: number, lockoutUntil: string | null) =>
  db.runAsync('UPDATE officers SET failed_attempts = ?, lockout_until = ? WHERE id = ?', [
    failedAttempts,
    lockoutUntil,
    id,
  ]);

export const resetFailedAttempts = (db: Db, id: number) =>
  db.runAsync('UPDATE officers SET failed_attempts = 0, lockout_until = NULL WHERE id = ?', [id]);

export const updateOfficerPhoto = async (db: Db, id: number, photoUri: string): Promise<void> => {
  const result = await db.runAsync('UPDATE officers SET photo_uri = ? WHERE id = ?', [photoUri, id]);
  if (result.changes !== 1) throw new Error('The profile picture could not be saved.');
};

/** Strip secrets before an officer object is handed to the UI. */
export const toPublicOfficer = ({ id, full_name, regimental_number, rank, station, photo_uri, created_at }: OfficerRow): Officer => ({
  id,
  fullName: full_name,
  regimentalNumber: regimental_number,
  rank,
  station,
  photoUri: photo_uri ?? null,
  createdAt: created_at,
});
