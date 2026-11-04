/** Pure helpers for officer data (no React, no database). */

/** "Joseph Tau" -> "JT": first letter of the first and last names. */
export const initials = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return `${first}${last}`.toUpperCase();
};
