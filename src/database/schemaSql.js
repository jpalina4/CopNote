/**
 * The CREATE TABLE / INDEX / TRIGGER statements for schema version 1.
 * Kept in its own module (plain string, no imports) so that the automated
 * tests can run exactly the same SQL against Node's built-in SQLite.
 * See schema.js for the explanation of each table.
 */
export const SCHEMA_V1 = `
      CREATE TABLE IF NOT EXISTS officers (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name         TEXT NOT NULL,
        regimental_number TEXT NOT NULL UNIQUE,
        rank              TEXT NOT NULL,
        station           TEXT NOT NULL,
        pin_hash          TEXT NOT NULL,
        pin_salt          TEXT NOT NULL,
        pin_iterations    INTEGER NOT NULL,
        failed_attempts   INTEGER NOT NULL DEFAULT 0,
        lockout_until     TEXT,
        created_at        TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pages (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        officer_id      INTEGER NOT NULL REFERENCES officers(id) ON DELETE RESTRICT,
        page_number     INTEGER,               -- NULL while a draft; assigned on save
        title           TEXT NOT NULL,
        incident_date   TEXT,                  -- 'YYYY-MM-DD'
        incident_time   TEXT,                  -- 'HH:MM'
        location        TEXT,
        latitude        REAL,
        longitude       REAL,
        incident_type   TEXT,
        people_involved TEXT,
        description     TEXT,
        action_taken    TEXT,
        status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'saved')),
        created_at      TEXT NOT NULL,
        updated_at      TEXT NOT NULL,
        saved_at        TEXT,
        UNIQUE (officer_id, page_number)       -- page numbers never repeat per officer
      );

      CREATE TABLE IF NOT EXISTS photos (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        page_id    INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        file_uri   TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS amendments (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        page_id    INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        officer_id INTEGER NOT NULL REFERENCES officers(id),
        note       TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_pages_officer ON pages(officer_id, status, incident_date);
      CREATE INDEX IF NOT EXISTS idx_photos_page ON photos(page_id);
      CREATE INDEX IF NOT EXISTS idx_amendments_page ON amendments(page_id);

      -- ── Record integrity enforced by the DATABASE, not just the UI ──────────
      -- Even if a bug in the app tried to change a saved page, SQLite refuses.
      CREATE TRIGGER IF NOT EXISTS trg_saved_page_no_update
      BEFORE UPDATE ON pages WHEN OLD.status = 'saved'
      BEGIN SELECT RAISE(ABORT, 'Saved pages are read-only. Add an amendment instead.'); END;

      CREATE TRIGGER IF NOT EXISTS trg_saved_page_no_delete
      BEFORE DELETE ON pages WHEN OLD.status = 'saved'
      BEGIN SELECT RAISE(ABORT, 'Saved pages cannot be deleted.'); END;

      CREATE TRIGGER IF NOT EXISTS trg_saved_page_no_photo_insert
      BEFORE INSERT ON photos WHEN (SELECT status FROM pages WHERE id = NEW.page_id) = 'saved'
      BEGIN SELECT RAISE(ABORT, 'Photos cannot be added to a saved page.'); END;

      CREATE TRIGGER IF NOT EXISTS trg_saved_page_no_photo_delete
      BEFORE DELETE ON photos WHEN (SELECT status FROM pages WHERE id = OLD.page_id) = 'saved'
      BEGIN SELECT RAISE(ABORT, 'Photos cannot be removed from a saved page.'); END;

      -- Amendments are append-only.
      CREATE TRIGGER IF NOT EXISTS trg_amendment_no_update
      BEFORE UPDATE ON amendments
      BEGIN SELECT RAISE(ABORT, 'Amendments cannot be changed.'); END;
`;

/** Schema version 2: the officer's optional profile picture (a file path, or a data: URI in a browser). */
export const SCHEMA_V2 = `
      ALTER TABLE officers ADD COLUMN photo_uri TEXT;
`;

/**
 * Schema version 3: renames the first demo officer on databases that were
 * already seeded. Skipped if that account has gone, or if 16237 is already
 * registered on this device, because regimental numbers must stay unique.
 */
export const SCHEMA_V3 = `
      UPDATE officers
      SET full_name = 'Johnson PALINA', regimental_number = '16237', rank = 'Constable'
      WHERE regimental_number = '10452' AND full_name = 'Joseph Tau'
        AND NOT EXISTS (SELECT 1 FROM officers WHERE regimental_number = '16237');
`;
