import type { BackupFileV1, BackupPayload, BackupRow, BackupValidationResult } from './types';
import { validateTaskInput } from '../repositories/taskRules';
import { validateEventInput } from '../repositories/eventRules';
import { validateExpenseInput } from '../repositories/expenseRules';

export const MAX_ROWS_PER_TABLE = 1000;
export const MAX_TOTAL_ROWS = 5000;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoDate(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

type RowsResult = { ok: true; rows: BackupRow[] } | { ok: false; reason: string };

function asRows(value: unknown, table: string): RowsResult {
  if (!Array.isArray(value)) {
    return { ok: false, reason: 'Invalid payload shape' };
  }

  if (value.length > MAX_ROWS_PER_TABLE) {
    return { ok: false, reason: `${table} exceeds maximum allowed rows (${MAX_ROWS_PER_TABLE})` };
  }

  const rows: BackupRow[] = [];
  for (const item of value) {
    if (!isObject(item)) {
      return { ok: false, reason: 'Invalid payload shape' };
    }

    const row: BackupRow = {};
    for (const [key, cell] of Object.entries(item)) {
      if (cell == null || typeof cell === 'string' || typeof cell === 'number') {
        row[key] = cell ?? null;
      } else {
        return { ok: false, reason: 'Invalid payload shape' };
      }
    }
    rows.push(row);
  }

  return { ok: true, rows };
}

type PayloadParseResult = { ok: true; payload: BackupPayload } | { ok: false; reason: string };

function parsePayload(value: unknown): PayloadParseResult {
  if (!isObject(value)) {
    return { ok: false, reason: 'Invalid payload shape' };
  }

  const required: Array<keyof BackupPayload> = [
    'projects',
    'rooms',
    'tasks',
    'events',
    'expenses',
    'attachments',
    'tags',
    'task_tags'
  ];
  const payload = {} as BackupPayload;
  let totalRows = 0;
  for (const key of required) {
    const rowsResult = asRows(value[key], key);
    if (!rowsResult.ok) {
      return rowsResult;
    }
    payload[key] = rowsResult.rows;
    totalRows += rowsResult.rows.length;
    if (totalRows > MAX_TOTAL_ROWS) {
      return { ok: false, reason: `Backup payload exceeds maximum allowed rows (${MAX_TOTAL_ROWS})` };
    }
  }

  const builderQuotesResult = asRows(value.builder_quotes, 'builder_quotes');
  if (value.builder_quotes != null && !builderQuotesResult.ok) {
    return builderQuotesResult;
  }
  const builderQuoteRows = builderQuotesResult.ok ? builderQuotesResult.rows : [];
  totalRows += builderQuoteRows.length;
  if (totalRows > MAX_TOTAL_ROWS) {
    return { ok: false, reason: `Backup payload exceeds maximum allowed rows (${MAX_TOTAL_ROWS})` };
  }
  payload.builder_quotes = builderQuoteRows ?? [];

  return { ok: true, payload };
}

function ensureForeignKeys(payload: BackupPayload): string | null {
  const projectIds = new Set(payload.projects.map((row) => asString(row.id)).filter((id): id is string => Boolean(id)));
  const roomIds = new Set(payload.rooms.map((row) => asString(row.id)).filter((id): id is string => Boolean(id)));
  const taskIds = new Set(payload.tasks.map((row) => asString(row.id)).filter((id): id is string => Boolean(id)));
  const expenseIds = new Set(payload.expenses.map((row) => asString(row.id)).filter((id): id is string => Boolean(id)));
  const tagIds = new Set(payload.tags.map((row) => asString(row.id)).filter((id): id is string => Boolean(id)));

  for (const row of payload.rooms) {
    const projectId = asString(row.project_id);
    if (!projectId || !projectIds.has(projectId)) {
      return 'Invalid room.project_id reference';
    }
  }

  for (const row of payload.tasks) {
    const projectId = asString(row.project_id);
    const roomId = asString(row.room_id);
    if (!projectId || !projectIds.has(projectId)) {
      return 'Invalid task.project_id reference';
    }
    if (!roomId || !roomIds.has(roomId)) {
      return 'Invalid task.room_id reference';
    }
  }

  for (const row of payload.events) {
    const projectId = asString(row.project_id);
    const roomId = asString(row.room_id);
    const taskId = asString(row.task_id);
    if (!projectId || !projectIds.has(projectId)) {
      return 'Invalid event.project_id reference';
    }
    if (roomId && !roomIds.has(roomId)) {
      return 'Invalid event.room_id reference';
    }
    if (taskId && !taskIds.has(taskId)) {
      return 'Invalid event.task_id reference';
    }
  }

  for (const row of payload.expenses) {
    const projectId = asString(row.project_id);
    const roomId = asString(row.room_id);
    const taskId = asString(row.task_id);
    if (!projectId || !projectIds.has(projectId)) {
      return 'Invalid expense.project_id reference';
    }
    if (roomId && !roomIds.has(roomId)) {
      return 'Invalid expense.room_id reference';
    }
    if (taskId && !taskIds.has(taskId)) {
      return 'Invalid expense.task_id reference';
    }
  }

  for (const row of payload.builder_quotes) {
    const projectId = asString(row.project_id);
    const roomId = asString(row.room_id);
    if (!projectId || !projectIds.has(projectId)) {
      return 'Invalid builder_quote.project_id reference';
    }
    if (roomId && !roomIds.has(roomId)) {
      return 'Invalid builder_quote.room_id reference';
    }
  }

  for (const row of payload.attachments) {
    const projectId = asString(row.project_id);
    const roomId = asString(row.room_id);
    const taskId = asString(row.task_id);
    const expenseId = asString(row.expense_id);
    if (!projectId || !projectIds.has(projectId)) {
      return 'Invalid attachment.project_id reference';
    }
    if (roomId && !roomIds.has(roomId)) {
      return 'Invalid attachment.room_id reference';
    }
    if (taskId && !taskIds.has(taskId)) {
      return 'Invalid attachment.task_id reference';
    }
    if (expenseId && !expenseIds.has(expenseId)) {
      return 'Invalid attachment.expense_id reference';
    }
  }

  for (const row of payload.tags) {
    const projectId = asString(row.project_id);
    if (!projectId || !projectIds.has(projectId)) {
      return 'Invalid tag.project_id reference';
    }
  }

  for (const row of payload.task_tags) {
    const taskId = asString(row.task_id);
    const tagId = asString(row.tag_id);
    if (!taskId || !taskIds.has(taskId)) {
      return 'Invalid task_tags.task_id reference';
    }
    if (!tagId || !tagIds.has(tagId)) {
      return 'Invalid task_tags.tag_id reference';
    }
  }

  return null;
}

function readString(row: BackupRow, key: string): string {
  const value = row[key];
  return typeof value === 'string' ? value : '';
}

function readNullableString(row: BackupRow, key: string): string | null {
  const value = row[key];
  if (value == null) {
    return null;
  }
  return typeof value === 'string' ? value : String(value);
}

function readNumber(row: BackupRow, key: string): number {
  const value = row[key];
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return Number(value);
  }
  return Number.NaN;
}

export function validateBackupBusinessRules(payload: BackupPayload): string | null {
  for (const [index, row] of payload.tasks.entries()) {
    try {
      validateTaskInput({
        roomId: readString(row, 'room_id'),
        title: readString(row, 'title'),
        status: readString(row, 'status'),
        waitingReason: readNullableString(row, 'waiting_reason'),
        tradeTags: [],
        customTags: []
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Task rule validation failed';
      return `Invalid task at index ${index}: ${message}`;
    }
  }

  for (const [index, row] of payload.events.entries()) {
    try {
      validateEventInput({
        title: readString(row, 'title'),
        startsAt: readString(row, 'starts_at')
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Event rule validation failed';
      return `Invalid event at index ${index}: ${message}`;
    }
  }

  for (const [index, row] of payload.expenses.entries()) {
    try {
      validateExpenseInput({
        amount: readNumber(row, 'amount'),
        incurredOn: readString(row, 'incurred_on')
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Expense rule validation failed';
      return `Invalid expense at index ${index}: ${message}`;
    }
  }

  return null;
}

export function validateBackupFile(input: unknown): BackupValidationResult {
  if (!isObject(input)) {
    return { ok: false, reason: 'Backup must be a JSON object' };
  }

  if (input.schemaVersion !== '1') {
    return { ok: false, reason: 'Unsupported backup schemaVersion' };
  }

  const exportedAt = asString(input.exportedAt);
  if (!exportedAt || !isIsoDate(exportedAt)) {
    return { ok: false, reason: 'Invalid exportedAt timestamp' };
  }

  const appVersion = asString(input.appVersion);
  if (!appVersion) {
    return { ok: false, reason: 'Missing appVersion' };
  }

  const projectId = asString(input.projectId);
  if (!projectId) {
    return { ok: false, reason: 'Missing projectId' };
  }

  const payloadResult = parsePayload(input.payload);
  if (!payloadResult.ok) {
    return { ok: false, reason: payloadResult.reason };
  }
  const payload = payloadResult.payload;

  const fkError = ensureForeignKeys(payload);
  if (fkError) {
    return { ok: false, reason: fkError };
  }

  const ruleError = validateBackupBusinessRules(payload);
  if (ruleError) {
    return { ok: false, reason: ruleError };
  }

  return {
    ok: true,
    backup: {
      schemaVersion: '1',
      exportedAt,
      appVersion,
      projectId,
      payload,
      warnings: Array.isArray(input.warnings)
        ? input.warnings.filter((x): x is string => typeof x === 'string')
        : undefined
    } satisfies BackupFileV1
  };
}
