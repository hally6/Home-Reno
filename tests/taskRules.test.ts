import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTagNames, validateTaskInput } from '../src/data/repositories/taskRules';

test('normalizeTagNames trims, lowercases, de-duplicates, and removes empty values', () => {
  const result = normalizeTagNames([' Plumber ', 'plumber', 'ELECTRICIAN', '', '  ', 'electrician', 'Painter']);
  assert.deepEqual(result, ['plumber', 'electrician', 'painter']);
});

test('validateTaskInput requires waiting reason when status is waiting', () => {
  assert.throws(
    () =>
      validateTaskInput({
        roomId: 'room-1',
        title: 'Install vanity',
        status: 'waiting',
        waitingReason: null,
        tradeTags: [],
        customTags: []
      }),
    /Waiting reason is required/
  );
});

test('validateTaskInput normalizes trade and custom tags', () => {
  const input = {
    roomId: 'room-1',
    title: 'Install vanity',
    status: 'ready',
    waitingReason: null,
    tradeTags: [' Plumber ', 'plumber', 'Painter'],
    customTags: ['Urgent', ' urgent ', 'Pass-1']
  };

  validateTaskInput(input);

  assert.deepEqual(input.tradeTags, ['plumber', 'painter']);
  assert.deepEqual(input.customTags, ['urgent', 'pass-1']);
});

test('validateTaskInput enforces max lengths for title and tags', () => {
  assert.throws(
    () =>
      validateTaskInput({
        roomId: 'room-1',
        title: 'x'.repeat(121),
        status: 'ready',
        waitingReason: null,
        tradeTags: [],
        customTags: []
      }),
    /Task title must be 120 characters or fewer/
  );

  assert.throws(
    () =>
      validateTaskInput({
        roomId: 'room-1',
        title: 'Install vanity',
        status: 'ready',
        waitingReason: null,
        tradeTags: ['x'.repeat(101)],
        customTags: []
      }),
    /Tag name must be 100 characters or fewer/
  );
});
