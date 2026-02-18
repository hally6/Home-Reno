import { getDatabase } from '@/data/database';
import { createId } from '@/data/id';
import { assertMaxLength, INPUT_LIMITS } from './inputLimits';
import { rollbackAndThrow } from './transactionError';

export type QuoteStatus = 'draft' | 'received' | 'selected' | 'rejected';

export type QuoteListItem = {
  id: string;
  roomId: string | null;
  roomName: string | null;
  title: string;
  scope: string | null;
  builderName: string;
  amount: number;
  currency: string;
  status: QuoteStatus;
  selectedAt: string | null;
  updatedAt: string;
};

export type QuoteFormInput = {
  projectId: string;
  roomId: string | null;
  title: string;
  scope: string;
  builderName: string;
  amount: number;
  currency: string;
  status: Exclude<QuoteStatus, 'selected'>;
  notes: string;
};

export type QuoteDetail = QuoteListItem & {
  projectId: string;
  notes: string | null;
  createdAt: string;
};

function validateQuoteInput(input: QuoteFormInput): void {
  if (!input.title.trim()) {
    throw new Error('Quote title is required');
  }
  assertMaxLength(input.title, INPUT_LIMITS.quoteTitle, 'Quote title');
  assertMaxLength(input.scope, INPUT_LIMITS.quoteScope, 'Quote scope');
  if (!input.builderName.trim()) {
    throw new Error('Builder name is required');
  }
  assertMaxLength(input.builderName, INPUT_LIMITS.quoteBuilderName, 'Builder name');
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Quote amount must be greater than zero');
  }
  if (!input.currency.trim()) {
    throw new Error('Currency is required');
  }
  assertMaxLength(input.currency, INPUT_LIMITS.quoteCurrency, 'Currency');
  assertMaxLength(input.notes, INPUT_LIMITS.quoteNotes, 'Quote notes');
}

export async function getQuoteList(projectId: string): Promise<QuoteListItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<QuoteListItem>(
    `
      SELECT
        q.id,
        q.room_id AS roomId,
        r.name AS roomName,
        q.title,
        q.scope,
        q.builder_name AS builderName,
        q.amount,
        q.currency,
        q.status,
        q.selected_at AS selectedAt,
        q.updated_at AS updatedAt
      FROM builder_quotes q
      LEFT JOIN rooms r ON r.id = q.room_id
      WHERE q.project_id = ?
      ORDER BY
        CASE q.status
          WHEN 'selected' THEN 1
          WHEN 'received' THEN 2
          WHEN 'draft' THEN 3
          ELSE 4
        END,
        q.amount ASC,
        q.updated_at DESC
    `,
    [projectId]
  );

  return rows.map((row) => ({
    ...row,
    amount: Number(row.amount ?? 0)
  }));
}

export async function getQuoteDetail(quoteId: string): Promise<QuoteDetail | null> {
  const db = await getDatabase();
  const quote = await db.getFirstAsync<QuoteDetail>(
    `
      SELECT
        q.id,
        q.project_id AS projectId,
        q.room_id AS roomId,
        r.name AS roomName,
        q.title,
        q.scope,
        q.builder_name AS builderName,
        q.amount,
        q.currency,
        q.status,
        q.notes,
        q.selected_at AS selectedAt,
        q.created_at AS createdAt,
        q.updated_at AS updatedAt
      FROM builder_quotes q
      LEFT JOIN rooms r ON r.id = q.room_id
      WHERE q.id = ?
      LIMIT 1
    `,
    [quoteId]
  );

  if (!quote) {
    return null;
  }

  return {
    ...quote,
    amount: Number(quote.amount ?? 0)
  };
}

export async function createQuote(input: QuoteFormInput): Promise<string> {
  validateQuoteInput(input);
  const db = await getDatabase();
  const quoteId = createId('quote');
  const now = new Date().toISOString();

  await db.runAsync(
    `
      INSERT INTO builder_quotes (
        id, project_id, room_id, title, scope, builder_name, amount, currency, status, notes, selected_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
    `,
    [
      quoteId,
      input.projectId,
      input.roomId,
      input.title.trim(),
      input.scope.trim() || null,
      input.builderName.trim(),
      input.amount,
      input.currency.trim().toUpperCase(),
      input.status,
      input.notes.trim() || null,
      now,
      now
    ]
  );

  return quoteId;
}

export async function updateQuote(quoteId: string, input: QuoteFormInput): Promise<void> {
  validateQuoteInput(input);
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `
      UPDATE builder_quotes
      SET
        room_id = ?,
        title = ?,
        scope = ?,
        builder_name = ?,
        amount = ?,
        currency = ?,
        status = ?,
        notes = ?,
        selected_at = CASE WHEN status = 'selected' THEN selected_at ELSE NULL END,
        updated_at = ?
      WHERE id = ? AND project_id = ?
    `,
    [
      input.roomId,
      input.title.trim(),
      input.scope.trim() || null,
      input.builderName.trim(),
      input.amount,
      input.currency.trim().toUpperCase(),
      input.status,
      input.notes.trim() || null,
      now,
      quoteId,
      input.projectId
    ]
  );
}

export async function selectQuote(projectId: string, quoteId: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');
  try {
    await db.runAsync(
      `
        UPDATE builder_quotes
        SET
          status = CASE WHEN id = ? THEN 'selected' ELSE CASE WHEN status = 'selected' THEN 'received' ELSE status END END,
          selected_at = CASE WHEN id = ? THEN ? ELSE NULL END,
          updated_at = ?
        WHERE project_id = ?
      `,
      [quoteId, quoteId, now, now, projectId]
    );
    await db.execAsync('COMMIT;');
  } catch (error) {
    await rollbackAndThrow(db, `selectQuote(${quoteId})`, error);
  }
}

export async function deleteQuote(projectId: string, quoteId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM builder_quotes WHERE id = ? AND project_id = ?`, [quoteId, projectId]);
}
