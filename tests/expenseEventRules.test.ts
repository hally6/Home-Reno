import test from 'node:test';
import assert from 'node:assert/strict';
import { validateExpenseInput } from '../src/data/repositories/expenseRules';
import { validateEventInput } from '../src/data/repositories/eventRules';

test('validateExpenseInput rejects zero or negative amount', () => {
  assert.throws(() => validateExpenseInput({ amount: 0, incurredOn: '2026-02-09' }), /greater than 0/);
  assert.throws(() => validateExpenseInput({ amount: -10, incurredOn: '2026-02-09' }), /greater than 0/);
});

test('validateExpenseInput rejects unreasonably large amount', () => {
  assert.throws(() => validateExpenseInput({ amount: 1_000_001, incurredOn: '2026-02-09' }), /or less/);
});

test('validateExpenseInput requires incurredOn', () => {
  assert.throws(() => validateExpenseInput({ amount: 100, incurredOn: '' }), /Expense date is required/);
});

test('validateEventInput requires title and startsAt', () => {
  assert.throws(
    () => validateEventInput({ title: '   ', startsAt: '2026-02-10T09:00:00.000Z' }),
    /Event title is required/
  );
  assert.throws(() => validateEventInput({ title: 'Plumber visit', startsAt: '' }), /Event start is required/);
});

test('validateEventInput accepts valid payload', () => {
  assert.doesNotThrow(() => validateEventInput({ title: 'Inspection', startsAt: '2026-02-10T09:00:00.000Z' }));
});

test('validateEventInput rejects invalid or out-of-range datetime', () => {
  assert.throws(
    () => validateEventInput({ title: 'Inspection', startsAt: 'not-a-date' }),
    /valid ISO datetime/
  );
  assert.throws(
    () => validateEventInput({ title: 'Inspection', startsAt: '2200-02-10T09:00:00.000Z' }),
    /between 2000 and 2100/
  );
});

test('validateEventInput enforces max lengths', () => {
  assert.throws(
    () => validateEventInput({ title: 'x'.repeat(121), startsAt: '2026-02-10T09:00:00.000Z' }),
    /Event title must be 120 characters or fewer/
  );
});

test('validateExpenseInput enforces max lengths', () => {
  assert.throws(
    () =>
      validateExpenseInput({
        amount: 10,
        incurredOn: '2026-02-10',
        vendor: 'x'.repeat(121)
      }),
    /Expense vendor must be 120 characters or fewer/
  );
});
