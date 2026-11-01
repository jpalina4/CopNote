/**
 * Local authentication logic (no UI here).
 *
 * LIMITATION (documented in README): this is ON-DEVICE authentication for a
 * student project. It proves the PIN matches the hash stored on this phone.
 * It cannot check that a person really is a serving officer — that needs a
 * central server connected to official RPNGC personnel records.
 */
import * as Crypto from 'expo-crypto';
import { LOCKOUT_MINUTES, MAX_FAILED_ATTEMPTS, PBKDF2_ITERATIONS } from '../utils/constants';
import { bytesToHex, hashPin, verifyPin } from '../utils/hash';
import { toTimestamp } from '../utils/dates';
import { normaliseRegimentalNumber } from '../utils/validation';
import { getPinPepper } from './sessionStore';
import {
  findOfficerById,
  findOfficerByRegimentalNumber,
  insertOfficer,
  recordFailedAttempt,
  resetFailedAttempts,
  toPublicOfficer,
} from '../database/officerRepo';

/** Generate a random 16-byte salt and hash the PIN with it (plus the device pepper). */
export const createPinRecord = async (pin) => {
  const pinSalt = bytesToHex(Crypto.getRandomBytes(16));
  const pinHash = await hashPin(pin, pinSalt, PBKDF2_ITERATIONS, await getPinPepper());
  return { pinHash, pinSalt, pinIterations: PBKDF2_ITERATIONS };
};

export class AuthError extends Error {}

export async function registerOfficer(db, { fullName, regimentalNumber, rank, station, pin }) {
  const regNo = normaliseRegimentalNumber(regimentalNumber);
  if (await findOfficerByRegimentalNumber(db, regNo)) {
    throw new AuthError('An officer with this regimental number is already registered on this device.');
  }
  const pinRecord = await createPinRecord(pin);
  const id = await insertOfficer(db, {
    fullName: fullName.trim().replace(/\s+/g, ' '),
    regimentalNumber: regNo,
    rank,
    station: station.trim(),
    ...pinRecord,
    createdAt: toTimestamp(),
  });
  return toPublicOfficer(await findOfficerById(db, id));
}

/**
 * Shared PIN check with brute-force protection: after MAX_FAILED_ATTEMPTS
 * wrong PINs the account is locked for LOCKOUT_MINUTES.
 */
async function checkPin(db, officerRow, pin) {
  const now = new Date();
  if (officerRow.lockout_until && officerRow.lockout_until > toTimestamp(now)) {
    throw new AuthError(`Too many wrong attempts. Try again after ${officerRow.lockout_until.slice(11, 16)}.`);
  }

  if (await verifyPin(pin, officerRow, await getPinPepper())) {
    await resetFailedAttempts(db, officerRow.id);
    return toPublicOfficer(officerRow);
  }

  const attempts = officerRow.failed_attempts + 1;
  const locked = attempts >= MAX_FAILED_ATTEMPTS;
  const until = locked ? toTimestamp(new Date(now.getTime() + LOCKOUT_MINUTES * 60000)) : null;
  await recordFailedAttempt(db, officerRow.id, locked ? 0 : attempts, until);
  throw new AuthError(
    locked
      ? `Too many wrong attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`
      : `Incorrect regimental number or PIN. ${MAX_FAILED_ATTEMPTS - attempts} attempt(s) left.`,
  );
}

export async function login(db, { regimentalNumber, pin }) {
  const row = await findOfficerByRegimentalNumber(db, normaliseRegimentalNumber(regimentalNumber));
  // Same message whether the number or the PIN was wrong, so the app does
  // not reveal which regimental numbers are registered.
  if (!row) throw new AuthError('Incorrect regimental number or PIN.');
  return checkPin(db, row, pin);
}

/** Used by the lock screen: the officer is known, only the PIN is asked for. */
export async function unlock(db, officerId, pin) {
  const row = await findOfficerById(db, officerId);
  if (!row) throw new AuthError('Officer account not found.');
  return checkPin(db, row, pin);
}

export const getOfficer = async (db, id) => {
  const row = await findOfficerById(db, id);
  return row ? toPublicOfficer(row) : null;
};
