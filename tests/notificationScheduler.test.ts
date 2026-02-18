import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScheduledReminders } from '../src/services/notificationScheduler';

test('buildScheduledReminders creates task and event reminders', () => {
  const now = new Date('2026-02-09T10:00:00.000Z');
  const reminders = buildScheduledReminders(
    now,
    { taskDueEnabled: true, eventEnabled: true, waitingEnabled: false, leadMinutes: 60 },
    [{ id: 'task_1', title: 'Install sink', dueAt: '2026-02-09T14:00:00.000Z', status: 'ready', waitingReason: null }],
    [{ id: 'event_1', title: 'Plumber visit', startsAt: '2026-02-09T16:00:00.000Z' }]
  );

  assert.equal(reminders.length, 2);
  assert.equal(reminders[0].sourceType, 'task');
  assert.equal(reminders[1].sourceType, 'event');
});

test('buildScheduledReminders skips done tasks and past reminders', () => {
  const now = new Date('2026-02-09T10:00:00.000Z');
  const reminders = buildScheduledReminders(
    now,
    { taskDueEnabled: true, eventEnabled: false, waitingEnabled: false, leadMinutes: 60 },
    [
      { id: 'task_done', title: 'Done', dueAt: '2026-02-09T14:00:00.000Z', status: 'done', waitingReason: null },
      { id: 'task_past', title: 'Past', dueAt: '2026-02-09T10:30:00.000Z', status: 'ready', waitingReason: null }
    ],
    []
  );

  assert.equal(reminders.length, 0);
});

test('buildScheduledReminders creates waiting follow-up when enabled', () => {
  const now = new Date('2026-02-09T10:00:00.000Z');
  const reminders = buildScheduledReminders(
    now,
    { taskDueEnabled: false, eventEnabled: false, waitingEnabled: true, leadMinutes: 30 },
    [{ id: 'task_waiting', title: 'Permit', dueAt: null, status: 'waiting', waitingReason: 'approvals' }],
    []
  );

  assert.equal(reminders.length, 1);
  assert.equal(reminders[0].category, 'waiting_followup');
});
