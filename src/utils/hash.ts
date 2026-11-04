/**
 * PIN hashing with PBKDF2-HMAC-SHA256.
 *
 * Why not store the PIN?  If the phone or a backup of the database is
 * copied, every PIN would be readable. We store only a one-way hash.
 *
 * Why a SALT?  A random per-officer salt means two officers with the same PIN
 * get different hashes, and pre-computed "rainbow tables" are useless.
 *
 * Why PBKDF2 and not plain SHA-256?  PBKDF2 repeats the hash thousands of
 * times, making each guess slow for an attacker. expo-crypto offers hashing
 * but no key-derivation function, so we use @noble/hashes — an audited,
 * pure-JavaScript library that runs in Expo Go without native code.
 *
 * Why a PEPPER?  A PIN has at most 1,000,000 combinations, so anyone who
 * copies the database could eventually try them all. The pepper is a random
 * secret kept OUTSIDE the database, in the Android Keystore / iOS Keychain
 * (expo-secure-store). Without it, a stolen database file cannot be
 * brute-forced.
 *
 * Note: this module receives the salt and pepper as arguments (it does not generate
 * it), which keeps it pure and testable in Node. Random salts come from
 * expo-crypto in services/authService.js.
 */
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import type { OfficerRow } from '../types.ts';

export const hashPin = async (pin: string, saltHex: string, iterations: number, pepper = ''): Promise<string> => {
  const key = await pbkdf2Async(sha256, utf8ToBytes(`${pepper}:${pin}`), hexToBytes(saltHex), {
    c: iterations,
    dkLen: 32,
  });
  return bytesToHex(key);
};

/**
 * Compare two hex strings in constant time, so the time taken does not
 * reveal how many leading characters matched.
 */
export const safeEqual = (a: unknown, b: unknown): boolean => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export const verifyPin = async (
  pin: string,
  { pin_hash, pin_salt, pin_iterations }: Pick<OfficerRow, 'pin_hash' | 'pin_salt' | 'pin_iterations'>,
  pepper = '',
): Promise<boolean> =>
  safeEqual(await hashPin(pin, pin_salt, pin_iterations, pepper), pin_hash);

export { bytesToHex };
