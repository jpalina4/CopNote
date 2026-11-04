/**
 * Shared TypeScript types for CopNote's data.
 *
 * Two shapes exist for each table:
 *  - a *Row* type: exactly what SQLite returns (snake_case column names);
 *  - an app type: the camelCase object the screens use (see rowToPage etc.).
 * Keeping both written down means a renamed column is caught by the
 * type checker instead of showing up as "undefined" on screen.
 */

/**
 * The few expo-sqlite methods the repositories use. Typed as an interface
 * (not expo-sqlite's SQLiteDatabase class) so the tests can pass in a small
 * stand-in built on Node's own SQLite.
 */
export type SQLValue = string | number | null;
export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: SQLValue[]): Promise<{ changes: number; lastInsertRowId: number }>;
  getFirstAsync<T>(sql: string, params: SQLValue[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params: SQLValue[]): Promise<T[]>;
}

export type PageStatus = 'draft' | 'saved';

/** Field name -> error message. An empty object means "valid". */
export type FieldErrors = Partial<Record<string, string>>;

// ── Officers ────────────────────────────────────────────────────────────────

export interface OfficerRow {
  id: number;
  full_name: string;
  regimental_number: string;
  rank: string;
  station: string;
  pin_hash: string;
  pin_salt: string;
  pin_iterations: number;
  failed_attempts: number;
  lockout_until: string | null;
  created_at: string;
}

/** An officer as the UI sees it: no PIN hash, salt or lockout details. */
export interface Officer {
  id: number;
  fullName: string;
  regimentalNumber: string;
  rank: string;
  station: string;
  createdAt: string;
}

export interface PinRecord {
  pinHash: string;
  pinSalt: string;
  pinIterations: number;
}

export interface NewOfficer extends PinRecord {
  fullName: string;
  regimentalNumber: string;
  rank: string;
  station: string;
  createdAt: string;
}

// ── Pages ───────────────────────────────────────────────────────────────────

export interface PageRow {
  id: number;
  officer_id: number;
  page_number: number | null;
  title: string;
  incident_date: string | null;
  incident_time: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  incident_type: string | null;
  people_involved: string | null;
  description: string | null;
  action_taken: string | null;
  status: PageStatus;
  created_at: string;
  updated_at: string;
  saved_at: string | null;
  /** From the officers JOIN; used for the serial number. */
  regimental_number?: string;
  photo_count?: number;
}

/** The fields an officer types into the page editor. */
export interface PageFields {
  title: string;
  incidentDate: string;
  incidentTime: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  incidentType: string;
  peopleInvolved: string;
  description: string;
  actionTaken: string;
}

export interface Page extends PageFields {
  id: number;
  officerId: number;
  /** null while a draft; assigned when the page is saved. */
  pageNumber: number | null;
  /** e.g. "10452-000012"; null for drafts. */
  serialNumber: string | null;
  status: PageStatus;
  createdAt: string;
  updatedAt: string;
  savedAt: string | null;
  photoCount: number;
}

export interface PageFilters {
  keyword?: string;
  incidentType?: string;
  status?: PageStatus | '';
  fromDate?: string;
  toDate?: string;
}

// ── Photos and amendments ───────────────────────────────────────────────────

export interface Photo {
  id: number;
  uri: string;
  createdAt: string;
}

export interface Amendment {
  id: number;
  note: string;
  createdAt: string;
  /** "Rank Full Name" of the officer who wrote it. */
  author: string;
}
