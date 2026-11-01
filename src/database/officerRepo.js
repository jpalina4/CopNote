/**
 * Officer data access ("repository").
 *
 * Every query uses "?" placeholders with a separate values array. SQLite
 * binds the values safely, so names or numbers typed by a user can never
 * change the meaning of the SQL.
 */

export const findOfficerByRegimentalNumber = (db, regimentalNumber) =>
  db.getFirstAsync('SELECT * FROM officers WHERE regimental_number = ?', [regimentalNumber]);

export const findOfficerById = (db, id) => db.getFirstAsync('SELECT * FROM officers WHERE id = ?', [id]);

export const insertOfficer = async (db, officer) => {
  const { fullName, regimentalNumber, rank, station, pinHash, pinSalt, pinIterations, createdAt } = officer;
  const result = await db.runAsync(
    `INSERT INTO officers
       (full_name, regimental_number, rank, station, pin_hash, pin_salt, pin_iterations, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [fullName, regimentalNumber, rank, station, pinHash, pinSalt, pinIterations, createdAt],
  );
  return result.lastInsertRowId;
};

export const recordFailedAttempt = (db, id, failedAttempts, lockoutUntil) =>
  db.runAsync('UPDATE officers SET failed_attempts = ?, lockout_until = ? WHERE id = ?', [
    failedAttempts,
    lockoutUntil,
    id,
  ]);

export const resetFailedAttempts = (db, id) =>
  db.runAsync('UPDATE officers SET failed_attempts = 0, lockout_until = NULL WHERE id = ?', [id]);

/** Strip secrets before an officer object is handed to the UI. */
export const toPublicOfficer = ({ id, full_name, regimental_number, rank, station, created_at }) => ({
  id,
  fullName: full_name,
  regimentalNumber: regimental_number,
  rank,
  station,
  createdAt: created_at,
});
