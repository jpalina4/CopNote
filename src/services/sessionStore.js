/**
 * Remembers which officer is signed in, using expo-secure-store.
 *
 * SecureStore saves values in the Android Keystore / iOS Keychain, which are
 * encrypted by the operating system. We store only the officer's id — never
 * the PIN. On restart the app knows WHO was signed in but still shows the
 * lock screen and asks for the PIN.
 *
 * SecureStore is not available on web, so every call is wrapped in try/catch
 * and the app simply asks for a full login instead.
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { bytesToHex } from '../utils/hash';

const SESSION_KEY = 'copnote.session.officerId';
const PEPPER_KEY = 'copnote.pinPepper';

let cachedPepper = null;

/**
 * The device's secret PIN "pepper" (see utils/hash.js). Created once on
 * first use and kept in the OS keystore, never in SQLite. If SecureStore is
 * unavailable (e.g. web) we fall back to an empty pepper.
 */
export async function getPinPepper() {
  if (cachedPepper !== null) return cachedPepper;
  try {
    let pepper = await SecureStore.getItemAsync(PEPPER_KEY);
    if (!pepper) {
      pepper = bytesToHex(Crypto.getRandomBytes(32));
      await SecureStore.setItemAsync(PEPPER_KEY, pepper);
    }
    cachedPepper = pepper;
  } catch {
    cachedPepper = '';
  }
  return cachedPepper;
}

export async function saveSession(officerId) {
  try {
    await SecureStore.setItemAsync(SESSION_KEY, String(officerId));
  } catch {
    // Not fatal: the officer will just need to log in again next time.
  }
}

export async function loadSession() {
  try {
    const value = await SecureStore.getItemAsync(SESSION_KEY);
    return value ? Number(value) : null;
  } catch {
    return null;
  }
}

export async function clearSession() {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    // ignore
  }
}
