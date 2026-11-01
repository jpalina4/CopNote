/**
 * Date helpers.
 *
 * Design decision: dates are stored as LOCAL time strings
 *   date      -> 'YYYY-MM-DD'
 *   time      -> 'HH:MM'
 *   timestamp -> 'YYYY-MM-DD HH:MM:SS'
 * Strings in this fixed-width format sort and compare correctly as text,
 * so SQLite can filter a date range with plain BETWEEN / >= / <=.
 * PNG mainland uses a single time zone (UTC+10) and an officer reads the
 * notebook in local time, so local strings are simpler than UTC here.
 */

const pad = (n) => String(n).padStart(2, '0');

export const toDateString = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const toTimeString = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const toTimestamp = (d = new Date()) =>
  `${toDateString(d)} ${toTimeString(d)}:${pad(d.getSeconds())}`;

/** Strict 'YYYY-MM-DD' check that also rejects impossible dates like 2026-02-31. */
export const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
};

/** 24-hour 'HH:MM'. */
export const isValidTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value ?? '');

/** '2026-11-01' -> '1 Nov 2026' for display. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const formatDate = (value) => {
  if (!isValidDate(value)) return value ?? '';
  const [y, m, d] = value.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

/** '2026-11-01 14:05:09' -> '1 Nov 2026, 14:05' */
export const formatTimestamp = (value) => {
  if (!value) return '';
  const [date, time = ''] = value.split(' ');
  return `${formatDate(date)}${time ? `, ${time.slice(0, 5)}` : ''}`;
};
