import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_ROWS_PER_TABLE, MAX_TOTAL_ROWS, validateBackupFile } from '../src/data/backup/backupValidation';
import type { BackupFileV1 } from '../src/data/backup/types';

function makeValidBackup(): BackupFileV1 {
  return {
    schemaVersion: '1',
    exportedAt: '2026-02-09T12:00:00.000Z',
    appVersion: '0.1.0',
    projectId: 'project_1',
    payload: {
      projects: [
        {
          id: 'project_1',
          name: 'Home',
          currency: 'USD',
          created_at: '2026-02-01T00:00:00.000Z',
          updated_at: '2026-02-01T00:00:00.000Z'
        }
      ],
      rooms: [
        {
          id: 'room_1',
          project_id: 'project_1',
          name: 'Kitchen',
          type: 'kitchen',
          order_index: 1,
          status: 'active',
          budget_planned: 0,
          created_at: '2026-02-01T00:00:00.000Z',
          updated_at: '2026-02-01T00:00:00.000Z'
        }
      ],
      tasks: [
        {
          id: 'task_1',
          project_id: 'project_1',
          room_id: 'room_1',
          title: 'Install sink',
          phase: 'install',
          status: 'ready',
          priority: 'medium',
          sort_index: 1,
          created_at: '2026-02-01T00:00:00.000Z',
          updated_at: '2026-02-01T00:00:00.000Z'
        }
      ],
      events: [
        {
          id: 'event_1',
          project_id: 'project_1',
          room_id: 'room_1',
          task_id: 'task_1',
          type: 'trade_visit',
          title: 'Plumber',
          starts_at: '2026-02-10T10:00:00.000Z',
          created_at: '2026-02-01T00:00:00.000Z',
          updated_at: '2026-02-01T00:00:00.000Z',
          is_all_day: 0
        }
      ],
      expenses: [
        {
          id: 'expense_1',
          project_id: 'project_1',
          room_id: 'room_1',
          task_id: 'task_1',
          category: 'plumbing',
          amount: 120,
          incurred_on: '2026-02-10',
          created_at: '2026-02-01T00:00:00.000Z',
          updated_at: '2026-02-01T00:00:00.000Z'
        }
      ],
      builder_quotes: [
        {
          id: 'quote_1',
          project_id: 'project_1',
          room_id: 'room_1',
          title: 'Kitchen install package',
          builder_name: 'ABC Builders',
          amount: 4500,
          currency: 'USD',
          status: 'received',
          created_at: '2026-02-01T00:00:00.000Z',
          updated_at: '2026-02-01T00:00:00.000Z'
        }
      ],
      attachments: [
        {
          id: 'attachment_1',
          project_id: 'project_1',
          room_id: 'room_1',
          task_id: 'task_1',
          expense_id: 'expense_1',
          kind: 'photo',
          uri: 'file://photo.jpg',
          created_at: '2026-02-01T00:00:00.000Z'
        }
      ],
      tags: [{ id: 'tag_1', project_id: 'project_1', name: 'plumber', type: 'trade' }],
      task_tags: [{ task_id: 'task_1', tag_id: 'tag_1' }]
    }
  };
}

test('validateBackupFile accepts valid v1 backup', () => {
  const result = validateBackupFile(makeValidBackup());
  assert.equal(result.ok, true);
});

test('validateBackupFile rejects wrong schema version', () => {
  const backup = makeValidBackup();
  (backup as { schemaVersion: string }).schemaVersion = '2';
  const result = validateBackupFile(backup);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.reason, /schemaVersion/i);
  }
});

test('validateBackupFile rejects FK mismatches', () => {
  const backup = makeValidBackup();
  backup.payload.tasks[0].room_id = 'missing_room';
  const result = validateBackupFile(backup);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.reason, /task\.room_id/i);
  }
});

test('validateBackupFile rejects malformed root payload', () => {
  const result = validateBackupFile({ schemaVersion: '1' });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.reason, /exportedAt|appVersion|projectId|payload/i);
  }
});

test('validateBackupFile rejects invalid exportedAt timestamp', () => {
  const backup = makeValidBackup();
  backup.exportedAt = 'not-a-date';
  const result = validateBackupFile(backup);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.reason, /exportedAt/i);
  }
});

test('validateBackupFile rejects invalid task_tags references', () => {
  const backup = makeValidBackup();
  backup.payload.task_tags[0].tag_id = 'missing_tag';
  const result = validateBackupFile(backup);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.reason, /task_tags\.tag_id/i);
  }
});

test('validateBackupFile rejects invalid builder quote room references', () => {
  const backup = makeValidBackup();
  backup.payload.builder_quotes[0].room_id = 'missing_room';
  const result = validateBackupFile(backup);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.reason, /builder_quote\.room_id/i);
  }
});

test('validateBackupFile rejects waiting task without waiting reason', () => {
  const backup = makeValidBackup();
  backup.payload.tasks[0].status = 'waiting';
  backup.payload.tasks[0].waiting_reason = null;

  const result = validateBackupFile(backup);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.reason, /invalid task/i);
    assert.match(result.reason, /waiting reason/i);
  }
});

test('validateBackupFile rejects event with empty title', () => {
  const backup = makeValidBackup();
  backup.payload.events[0].title = '   ';

  const result = validateBackupFile(backup);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.reason, /invalid event/i);
    assert.match(result.reason, /title is required/i);
  }
});

test('validateBackupFile rejects expense with non-positive amount', () => {
  const backup = makeValidBackup();
  backup.payload.expenses[0].amount = 0;

  const result = validateBackupFile(backup);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.reason, /invalid expense/i);
    assert.match(result.reason, /amount must be greater than 0/i);
  }
});

test('validateBackupFile accepts payload within row limits', () => {
  const backup = makeValidBackup();
  backup.payload.tags = Array.from({ length: MAX_ROWS_PER_TABLE }, (_, idx) => ({
    id: `tag_${idx}`,
    project_id: 'project_1',
    name: `tag${idx}`,
    type: 'custom'
  }));
  backup.payload.task_tags = [];

  const result = validateBackupFile(backup);
  assert.equal(result.ok, true);
});

test('validateBackupFile rejects when table row limit is exceeded', () => {
  const backup = makeValidBackup();
  backup.payload.tags = Array.from({ length: MAX_ROWS_PER_TABLE + 1 }, (_, idx) => ({
    id: `tag_${idx}`,
    project_id: 'project_1',
    name: `tag${idx}`,
    type: 'custom'
  }));

  const result = validateBackupFile(backup);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.reason, /tags exceeds maximum allowed rows/i);
  }
});

test('validateBackupFile rejects when total row limit is exceeded', () => {
  const backup = makeValidBackup();
  const rowsPerCollection = Math.floor(MAX_TOTAL_ROWS / 8);

  backup.payload.rooms = Array.from({ length: rowsPerCollection }, (_, idx) => ({
    id: `room_${idx}`,
    project_id: 'project_1'
  }));
  backup.payload.tasks = Array.from({ length: rowsPerCollection }, (_, idx) => ({
    id: `task_${idx}`,
    project_id: 'project_1',
    room_id: backup.payload.rooms[idx].id
  }));
  backup.payload.events = Array.from({ length: rowsPerCollection }, (_, idx) => ({
    id: `event_${idx}`,
    project_id: 'project_1',
    room_id: backup.payload.rooms[idx].id,
    task_id: backup.payload.tasks[idx].id
  }));
  backup.payload.expenses = Array.from({ length: rowsPerCollection }, (_, idx) => ({
    id: `expense_${idx}`,
    project_id: 'project_1',
    room_id: backup.payload.rooms[idx].id,
    task_id: backup.payload.tasks[idx].id
  }));
  backup.payload.attachments = Array.from({ length: rowsPerCollection }, (_, idx) => ({
    id: `attachment_${idx}`,
    project_id: 'project_1',
    room_id: backup.payload.rooms[idx].id,
    task_id: backup.payload.tasks[idx].id,
    expense_id: backup.payload.expenses[idx].id
  }));
  backup.payload.tags = Array.from({ length: rowsPerCollection }, (_, idx) => ({
    id: `tag_${idx}`,
    project_id: 'project_1',
    name: `tag${idx}`,
    type: 'custom'
  }));
  backup.payload.task_tags = Array.from({ length: rowsPerCollection }, (_, idx) => ({
    task_id: backup.payload.tasks[idx].id,
    tag_id: backup.payload.tags[idx].id
  }));
  backup.payload.builder_quotes = Array.from({ length: rowsPerCollection }, (_, idx) => ({
    id: `quote_${idx}`,
    project_id: 'project_1',
    room_id: backup.payload.rooms[idx].id
  }));

  backup.payload.projects = [
    ...backup.payload.projects,
    {
      id: 'project_2'
    }
  ];

  const result = validateBackupFile(backup);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.reason, /backup payload exceeds maximum allowed rows/i);
  }
});
