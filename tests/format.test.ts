import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDaysUntilDue,
  formatBudgetVariance,
  formatDate,
  formatDateTime,
  formatOptionLabel,
  formatTime,
  isOverdue
} from '../src/utils/format';

test('formatDate supports explicit timezone and locale', () => {
  const value = '2026-02-14T23:30:00.000Z';
  const utcText = formatDate(value, { locale: 'en-US', timeZone: 'UTC' });
  const tokyoText = formatDate(value, { locale: 'en-US', timeZone: 'Asia/Tokyo' });

  assert.notEqual(utcText, tokyoText);
});

test('formatDateTime supports explicit timezone and locale', () => {
  const value = '2026-02-14T23:30:00.000Z';
  const utcText = formatDateTime(value, { locale: 'en-US', timeZone: 'UTC' });
  const laText = formatDateTime(value, { locale: 'en-US', timeZone: 'America/Los_Angeles' });

  assert.notEqual(utcText, laText);
});

test('formatOptionLabel handles hyphens, camelCase, and acronyms', () => {
  assert.equal(formatOptionLabel('first-fix'), 'First Fix');
  assert.equal(formatOptionLabel('myCustomValue'), 'My Custom Value');
  assert.equal(formatOptionLabel('hvac_check'), 'HVAC Check');
});

test('time and due-date helpers return deterministic values', () => {
  assert.equal(formatTime(9, 5, { locale: 'en-US' }), '09:05');
  assert.equal(calculateDaysUntilDue('2026-02-16T12:00:00.000Z', new Date('2026-02-14T10:00:00.000Z')), 2);
  assert.equal(isOverdue('2026-02-13T23:59:59.999Z', 'ready', new Date('2026-02-14T10:00:00.000Z')), true);
  assert.equal(isOverdue('2026-02-13T23:59:59.999Z', 'done', new Date('2026-02-14T10:00:00.000Z')), false);
});

test('formatBudgetVariance indicates over/under budget', () => {
  assert.match(formatBudgetVariance(1000, 800, 'USD'), /Under by/);
  assert.match(formatBudgetVariance(1000, 1200, 'USD'), /Over by/);
  assert.match(formatBudgetVariance(1000, 1000, 'USD'), /On budget/);
});
