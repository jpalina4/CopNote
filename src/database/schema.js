/**
 * Database schema and migrations.
 *
 * Tables and relationships (one-to-many, enforced with FOREIGN KEYs):
 *
 *   officers 1 ──< pages 1 ──< photos
 *                       1 ──< amendments >── 1 officers
 *
 * - officers:   one row per registered officer. Only a salted PIN HASH is kept.
 * - pages:      one row per notebook page. status is 'draft' or 'saved'.
 * - photos:     file paths of images copied into the app's private storage.
 *               (Images are NOT stored inside SQLite: large blobs make the
 *               database slow and huge; a path is small and fast.)
 * - amendments: corrections added to a saved page. The original text is
 *               never changed, which mirrors how a paper notebook works: you
 *               do not tear out pages, you write a dated correction.
 *
 * Migrations use SQLite's built-in PRAGMA user_version number. Each time the
 * schema changes we add a new step; existing installs run only the steps
 * they have not yet seen, so officers keep their data on app updates.
 */
import { seedDatabase } from './seed';
import { SCHEMA_V1, SCHEMA_V2 } from './schemaSql.js';

const DATABASE_VERSION = 2;

export const DATABASE_NAME = 'copnote.db';

export async function migrateDbIfNeeded(db) {
  // Foreign keys are OFF by default in SQLite and must be enabled per connection.
  await db.execAsync('PRAGMA foreign_keys = ON;');
  // WAL journal mode makes writes faster and safer if the app is killed mid-write.
  await db.execAsync('PRAGMA journal_mode = WAL;');

  const { user_version: currentVersion } = await db.getFirstAsync('PRAGMA user_version');
  if (currentVersion >= DATABASE_VERSION) return;

  if (currentVersion === 0) {
    // execAsync is only used for FIXED SQL written by us — never user input.
    await db.execAsync(SCHEMA_V1);

    await seedDatabase(db);
  }

  if (currentVersion < 2) {
    await db.execAsync(SCHEMA_V2);
  }

  // PRAGMA does not accept "?" parameters; DATABASE_VERSION is our own constant, not user input.
  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
