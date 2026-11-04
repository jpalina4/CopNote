/**
 * Unit tests for the pure helper modules. Run with:  npm test
 * Uses Node's built-in test runner, so no extra test framework is needed.
 * These modules have no React Native imports, which is exactly why they
 * can be tested on a laptop without a phone.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidDate, isValidTime, formatDate } from '../src/utils/dates.ts';
import {
  validateRegistration,
  validateLogin,
  validatePage,
  normaliseRegimentalNumber,
  isValidRegimentalNumber,
  hasErrors,
} from '../src/utils/validation.ts';
import { buildPageQuery } from '../src/utils/pageQuery.ts';
import { summarisePages, removeAt, updateField, escapeHtml, pageLabel, formatSerial } from '../src/utils/pageHelpers.ts';
import { hashPin, safeEqual, verifyPin } from '../src/utils/hash.ts';

test('dates: validation rejects impossible values', () => {
  assert.equal(isValidDate('2026-11-01'), true);
  assert.equal(isValidDate('2026-02-31'), false);
  assert.equal(isValidDate('01/11/2026'), false);
  assert.equal(isValidTime('23:59'), true);
  assert.equal(isValidTime('24:00'), false);
  assert.equal(formatDate('2026-11-01'), '1 Nov 2026');
});

test('regimental number normalisation and format', () => {
  assert.equal(normaliseRegimentalNumber('  rpngc-4821 '), 'RPNGC-4821');
  assert.equal(isValidRegimentalNumber('10452'), true);
  assert.equal(isValidRegimentalNumber('PM/2210'), true);
  assert.equal(isValidRegimentalNumber('12'), false);
  assert.equal(isValidRegimentalNumber('AB--12'), false);
});

test('registration validation', () => {
  const good = { fullName: 'Kila Morea', regimentalNumber: '20931', rank: 'Constable', station: 'Gerehu Police Station', pin: '4826', confirmPin: '4826' };
  assert.deepEqual(validateRegistration(good), {});
  const bad = validateRegistration({ ...good, pin: '1111', confirmPin: '2222', rank: 'General' });
  assert.ok(bad.pin && bad.confirmPin && bad.rank);
  assert.ok(validateRegistration({ ...good, pin: '12' }).pin);
});

test('login validation', () => {
  assert.equal(hasErrors(validateLogin({ regimentalNumber: '10452', pin: '2580' })), false);
  assert.ok(validateLogin({ regimentalNumber: '', pin: 'abcd' }).pin);
});

test('page validation: drafts are lenient, saving is strict', () => {
  const draft = { title: 'Fight at Gerehu market' };
  assert.deepEqual(validatePage(draft, { forSave: false }), {});
  const errors = validatePage(draft, { forSave: true });
  for (const f of ['incidentDate', 'incidentTime', 'incidentType', 'location', 'description', 'actionTaken']) assert.ok(errors[f], f);
  assert.ok(validatePage({ title: 'ok title', incidentDate: '2026-13-01' }, { forSave: false }).incidentDate);
});

test('buildPageQuery uses placeholders, never raw input', () => {
  const evil = "'; DROP TABLE pages; --";
  const { sql, params } = buildPageQuery(7, { keyword: evil, incidentType: 'Theft', status: 'saved', fromDate: '2026-01-01', toDate: '2026-12-31' });
  assert.ok(!sql.includes('DROP'));
  assert.equal(params[0], 7);
  assert.ok(params.includes(`%${evil}%`));
  assert.equal((sql.match(/\?/g) || []).length, params.length);
});

test('buildPageQuery with no filters only restricts by officer', () => {
  const { sql, params } = buildPageQuery(3);
  assert.deepEqual(params, [3]);
  assert.ok(sql.includes('p.officer_id = ?'));
});

test('summarisePages counts with reduce', () => {
  const pages = [
    { status: 'saved', incidentType: 'Theft', createdAt: '2026-11-01 08:00:00' },
    { status: 'saved', incidentType: 'Theft', createdAt: '2026-10-30 08:00:00' },
    { status: 'draft', incidentType: '', createdAt: '2026-11-01 09:00:00' },
  ];
  const s = summarisePages(pages, '2026-11-01');
  assert.equal(s.total, 3);
  assert.equal(s.saved, 2);
  assert.equal(s.drafts, 1);
  assert.equal(s.today, 2);
  assert.equal(s.byType.Theft, 2);
  assert.equal(s.byType.Assault, 0);
});

test('immutable helpers do not modify their input', () => {
  const list = Object.freeze(['a', 'b', 'c']);
  assert.deepEqual(removeAt(list, 1), ['a', 'c']);
  const page = Object.freeze({ title: 'x' });
  assert.deepEqual(updateField(page, 'title', 'y'), { title: 'y' });
  assert.equal(page.title, 'x');
});

test('pageLabel and escapeHtml', () => {
  assert.equal(pageLabel({ pageNumber: 4 }), 'Page 4');
  assert.equal(pageLabel({ pageNumber: null }), 'Draft');
  assert.equal(formatSerial('10452', 12), '10452-000012');
  assert.equal(formatSerial('PM/2210', 1), 'PM/2210-000001');
  assert.equal(formatSerial('10452', null), null);
  assert.equal(escapeHtml('<b>"Tom" & Co</b>'), '&lt;b&gt;&quot;Tom&quot; &amp; Co&lt;/b&gt;');
});

test('PIN hashing: deterministic per salt, different across salts, verifiable', async () => {
  const salt1 = '00112233445566778899aabbccddeeff';
  const salt2 = 'ffeeddccbbaa99887766554433221100';
  const h1 = await hashPin('2580', salt1, 1000);
  assert.equal(h1.length, 64);
  assert.equal(await hashPin('2580', salt1, 1000), h1);
  assert.notEqual(await hashPin('2580', salt2, 1000), h1);
  assert.equal(await verifyPin('2580', { pin_hash: h1, pin_salt: salt1, pin_iterations: 1000 }), true);
  assert.equal(await verifyPin('2581', { pin_hash: h1, pin_salt: salt1, pin_iterations: 1000 }), false);
  // A different pepper gives a different hash, so a copied DB without the keystore secret is useless.
  assert.notEqual(await hashPin('2580', salt1, 1000, 'device-secret'), h1);
  assert.equal(await verifyPin('2580', { pin_hash: await hashPin('2580', salt1, 1000, 'pep'), pin_salt: salt1, pin_iterations: 1000 }, 'pep'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
});
