/**
 * App-wide constants.
 *
 * Keeping "magic values" in one module means a change (e.g. a new incident
 * type, or a longer inactivity timeout) is made in exactly one place.
 */

export const INCIDENT_TYPES: string[] = [
  'Theft',
  'Assault',
  'Traffic accident',
  'Domestic dispute',
  'Property damage',
  'Other',
];

export const PAGE_STATUS = Object.freeze({
  DRAFT: 'draft',
  SAVED: 'saved',
});

export const RANKS: string[] = [
  'Constable',
  'Senior Constable',
  'First Constable',
  'Sergeant',
  'Senior Sergeant',
  'Inspector',
  'Chief Inspector',
  'Superintendent',
];

/** Lock the app after this many milliseconds without a touch or key press. */
export const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

/** Failed PIN attempts allowed before a temporary lockout. */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 5;

/**
 * PBKDF2 work factor. Hashing here is pure JavaScript, and Hermes (the
 * phone's JS engine) has no JIT compiler, so it is many times slower than a
 * server. On a laptop with the JIT disabled, 20,000 iterations took ~6 s; 4,000
 * should keep login to roughly a second (confirm on a real phone). Stored per
 * officer, so it can be raised later without breaking existing accounts.
 * (A 4–6 digit PIN has only 1,000,000 combinations, so the real protection
 * is the lockout plus the secret "pepper" kept in SecureStore — see hash.js.)
 */
export const PBKDF2_ITERATIONS = 4000;

export const MAX_PHOTOS_PER_PAGE = 10;
