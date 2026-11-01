/**
 * Form validation as PURE functions.
 *
 * Each validator takes plain data and returns an "errors" object such as
 *   { pin: 'PIN must be 4 to 6 digits' }
 * An empty object means the input is valid. Because these functions do not
 * touch React state or the database, they are easy to unit test
 * (see tests/utils.test.mjs) and reuse on any screen.
 */
import { INCIDENT_TYPES, RANKS } from './constants.js';
import { isValidDate, isValidTime } from './dates.js';

const trimmed = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * Regimental numbers vary by force and era, so we accept 3–10 letters/digits
 * (optionally with one hyphen or slash), e.g. "12345", "RPNGC-4821", "PM/2210".
 * We normalise to upper case so "rpngc-4821" and "RPNGC-4821" are the same officer.
 */
export const normaliseRegimentalNumber = (value) => trimmed(value).toUpperCase().replace(/\s+/g, '');
export const isValidRegimentalNumber = (value) =>
  /^[A-Z0-9]{1,8}([-/][A-Z0-9]{1,8})?$/.test(value) && value.replace(/[-/]/g, '').length >= 3;

export const isValidPin = (pin) => /^\d{4,6}$/.test(pin ?? '');

export const validateRegistration = ({ fullName, regimentalNumber, rank, station, pin, confirmPin }) => {
  const errors = {};
  const name = trimmed(fullName);
  if (name.length < 3) errors.fullName = 'Enter your full name (at least 3 characters).';
  else if (!/^[A-Za-z][A-Za-z .'-]*$/.test(name)) errors.fullName = 'Name can contain letters, spaces, apostrophes and hyphens only.';

  if (!isValidRegimentalNumber(normaliseRegimentalNumber(regimentalNumber)))
    errors.regimentalNumber = 'Enter a valid regimental number (letters and digits, e.g. 12345 or RPNGC-4821).';

  if (!RANKS.includes(rank)) errors.rank = 'Select your rank.';
  if (trimmed(station).length < 2) errors.station = 'Enter your station (e.g. Boroko Police Station).';

  if (!isValidPin(pin)) errors.pin = 'PIN must be 4 to 6 digits.';
  else if (/^(\d)\1+$/.test(pin)) errors.pin = 'Choose a PIN that is not one repeated digit.';
  if (pin !== confirmPin) errors.confirmPin = 'PINs do not match.';
  return errors;
};

export const validateLogin = ({ regimentalNumber, pin }) => {
  const errors = {};
  if (!normaliseRegimentalNumber(regimentalNumber)) errors.regimentalNumber = 'Enter your regimental number.';
  if (!isValidPin(pin)) errors.pin = 'Enter your 4 to 6 digit PIN.';
  return errors;
};

/**
 * Two levels of validation for a notebook page:
 *  - a DRAFT only needs a title, so an officer can jot something down quickly;
 *  - a page being SAVED (locked) must be complete, because it can never be
 *    edited afterwards.
 */
export const validatePage = (page, { forSave }) => {
  const errors = {};
  const title = trimmed(page.title);
  if (title.length < 3) errors.title = 'Give the incident a short title (at least 3 characters).';
  else if (title.length > 120) errors.title = 'Title must be 120 characters or fewer.';

  if (page.incidentDate && !isValidDate(page.incidentDate)) errors.incidentDate = 'Use the format YYYY-MM-DD.';
  if (page.incidentTime && !isValidTime(page.incidentTime)) errors.incidentTime = 'Use 24-hour time HH:MM.';
  if (page.incidentType && !INCIDENT_TYPES.includes(page.incidentType)) errors.incidentType = 'Select an incident type.';

  if (forSave) {
    if (!page.incidentDate) errors.incidentDate = 'Date of the incident is required.';
    if (!page.incidentTime) errors.incidentTime = 'Time of the incident is required.';
    if (!page.incidentType) errors.incidentType = 'Select an incident type.';
    if (trimmed(page.location).length < 2) errors.location = 'Enter where the incident happened.';
    if (trimmed(page.description).length < 10) errors.description = 'Describe what happened (at least 10 characters).';
    if (trimmed(page.actionTaken).length < 3) errors.actionTaken = 'Record the action taken.';
  }
  return errors;
};

export const validateAmendment = (note) =>
  trimmed(note).length < 5 ? { note: 'An amendment must be at least 5 characters.' } : {};

export const hasErrors = (errors) => Object.keys(errors).length > 0;
