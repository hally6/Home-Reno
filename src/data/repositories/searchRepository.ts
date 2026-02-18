import { getDatabase } from '@/data/database';
import {
  type EventSearchResult,
  type ExpenseSearchResult,
  type SearchParams,
  type SearchResult,
  type TaskSearchResult,
  scoreSearchResult,
  sortSearchResults
} from './searchQuery';

export type { SearchParams, SearchResult } from './searchQuery';

export type SearchPage = {
  items: SearchResult[];
  nextCursor: string | null;
};

type FtsKind = 'task' | 'event' | 'expense';
type FtsRow = { kind: FtsKind; id: string };

function normalizeLike(query: string): string {
  return `%${query.trim()}%`;
}

function normalizeFtsQuery(rawQuery: string): string | null {
  const tokens = rawQuery
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9_]/g, '').trim())
    .filter(Boolean);
  if (tokens.length === 0) {
    return null;
  }
  return tokens.join(' OR ');
}

async function lookupFtsMatches(projectId: string, query: string): Promise<Record<FtsKind, Set<string>> | null> {
  const ftsQuery = normalizeFtsQuery(query);
  if (!ftsQuery) {
    return null;
  }

  const db = await getDatabase();
  try {
    const rows = await db.getAllAsync<FtsRow>(
      `
        SELECT entity_kind AS kind, entity_id AS id
        FROM search_fts
        WHERE project_id = ?
          AND search_fts MATCH ?
        ORDER BY entity_kind ASC, entity_id ASC
        LIMIT 500
      `,
      [projectId, ftsQuery]
    );

    const matches: Record<FtsKind, Set<string>> = {
      task: new Set<string>(),
      event: new Set<string>(),
      expense: new Set<string>()
    };
    for (const row of rows) {
      matches[row.kind].add(row.id);
    }
    return matches;
  } catch {
    return null;
  }
}

function appendEntityIdFilter(
  sql: string,
  args: Array<string | null>,
  alias: string,
  ids: Set<string>
): { sql: string; args: Array<string | null> } {
  if (ids.size === 0) {
    return { sql: `${sql} AND 1 = 0`, args };
  }
  const placeholders = Array.from(ids)
    .map(() => '?')
    .join(', ');
  return {
    sql: `${sql} AND ${alias}.id IN (${placeholders})`,
    args: [...args, ...Array.from(ids)]
  };
}

function paginateResults(results: SearchResult[], cursor: string | null, limit: number): SearchPage {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const start = cursor ? Number.parseInt(cursor, 10) : 0;
  const offset = Number.isFinite(start) && start >= 0 ? start : 0;
  const items = results.slice(offset, offset + safeLimit);
  const nextOffset = offset + items.length;
  return {
    items,
    nextCursor: nextOffset < results.length ? String(nextOffset) : null
  };
}

export async function searchProjectPage(
  projectId: string,
  params: SearchParams,
  options?: { cursor?: string | null; limit?: number }
): Promise<SearchPage> {
  const db = await getDatabase();
  const queryLike = normalizeLike(params.query);
  const ftsMatches = await lookupFtsMatches(projectId, params.query);

  let taskArgs: Array<string | null> = [projectId];
  let taskFilter = '';
  if (ftsMatches) {
    const filtered = appendEntityIdFilter(taskFilter, taskArgs, 't', ftsMatches.task);
    taskFilter = filtered.sql;
    taskArgs = filtered.args;
  } else {
    taskFilter += `
      AND (
        t.title LIKE ? COLLATE NOCASE
        OR COALESCE(t.description, '') LIKE ? COLLATE NOCASE
        OR COALESCE(r.name, '') LIKE ? COLLATE NOCASE
      )
    `;
    taskArgs.push(queryLike, queryLike, queryLike);
  }
  if (params.roomId) {
    taskFilter += ` AND t.room_id = ?`;
    taskArgs.push(params.roomId);
  }
  if (params.status) {
    taskFilter += ` AND t.status = ?`;
    taskArgs.push(params.status);
  }
  if (params.phase) {
    taskFilter += ` AND t.phase = ?`;
    taskArgs.push(params.phase);
  }
  if (params.dateFrom) {
    taskFilter += ` AND COALESCE(t.due_at, t.start_at) >= ?`;
    taskArgs.push(params.dateFrom);
  }
  if (params.dateTo) {
    taskFilter += ` AND COALESCE(t.due_at, t.start_at) <= ?`;
    taskArgs.push(params.dateTo);
  }

  const taskRows = await db.getAllAsync<TaskSearchResult>(
    `
      SELECT
        'task' AS kind,
        t.id,
        t.title,
        r.name AS roomName,
        COALESCE(t.due_at, t.start_at) AS date,
        t.updated_at AS updatedAt,
        t.status,
        t.phase,
        0 AS relevance
      FROM tasks t
      LEFT JOIN rooms r ON r.id = t.room_id
      WHERE t.project_id = ?
        AND t.deleted_at IS NULL
        ${taskFilter}
      ORDER BY COALESCE(t.due_at, t.start_at) DESC, t.updated_at DESC
      LIMIT 120
    `,
    taskArgs
  );

  let eventArgs: Array<string | null> = [projectId];
  let eventFilter = '';
  if (ftsMatches) {
    const filtered = appendEntityIdFilter(eventFilter, eventArgs, 'e', ftsMatches.event);
    eventFilter = filtered.sql;
    eventArgs = filtered.args;
  } else {
    eventFilter += `
      AND (
        e.title LIKE ? COLLATE NOCASE
        OR COALESCE(e.description, '') LIKE ? COLLATE NOCASE
        OR COALESCE(r.name, '') LIKE ? COLLATE NOCASE
      )
    `;
    eventArgs.push(queryLike, queryLike, queryLike);
  }
  if (params.roomId) {
    eventFilter += ` AND e.room_id = ?`;
    eventArgs.push(params.roomId);
  }
  if (params.dateFrom) {
    eventFilter += ` AND e.starts_at >= ?`;
    eventArgs.push(params.dateFrom);
  }
  if (params.dateTo) {
    eventFilter += ` AND e.starts_at <= ?`;
    eventArgs.push(params.dateTo);
  }

  const eventRows = await db.getAllAsync<EventSearchResult>(
    `
      SELECT
        'event' AS kind,
        e.id,
        e.title,
        r.name AS roomName,
        e.starts_at AS date,
        e.updated_at AS updatedAt,
        e.type AS subtype,
        0 AS relevance
      FROM events e
      LEFT JOIN rooms r ON r.id = e.room_id
      WHERE e.project_id = ?
        ${eventFilter}
      ORDER BY e.starts_at DESC, e.updated_at DESC
      LIMIT 120
    `,
    eventArgs
  );

  let expenseArgs: Array<string | null> = [projectId];
  let expenseFilter = '';
  if (ftsMatches) {
    const filtered = appendEntityIdFilter(expenseFilter, expenseArgs, 'e', ftsMatches.expense);
    expenseFilter = filtered.sql;
    expenseArgs = filtered.args;
  } else {
    expenseFilter += `
      AND (
        e.category LIKE ? COLLATE NOCASE
        OR COALESCE(e.vendor, '') LIKE ? COLLATE NOCASE
        OR COALESCE(r.name, '') LIKE ? COLLATE NOCASE
      )
    `;
    expenseArgs.push(queryLike, queryLike, queryLike);
  }
  if (params.roomId) {
    expenseFilter += ` AND e.room_id = ?`;
    expenseArgs.push(params.roomId);
  }
  if (params.category) {
    expenseFilter += ` AND e.category = ?`;
    expenseArgs.push(params.category);
  }
  if (params.dateFrom) {
    expenseFilter += ` AND e.incurred_on >= ?`;
    expenseArgs.push(params.dateFrom);
  }
  if (params.dateTo) {
    expenseFilter += ` AND e.incurred_on <= ?`;
    expenseArgs.push(params.dateTo);
  }

  const expenseRows = await db.getAllAsync<ExpenseSearchResult>(
    `
      SELECT
        'expense' AS kind,
        e.id,
        e.category AS title,
        r.name AS roomName,
        e.incurred_on AS date,
        e.updated_at AS updatedAt,
        e.category AS subtype,
        e.amount AS amount,
        0 AS relevance
      FROM expenses e
      LEFT JOIN rooms r ON r.id = e.room_id
      WHERE e.project_id = ?
        ${expenseFilter}
      ORDER BY e.incurred_on DESC, e.updated_at DESC
      LIMIT 120
    `,
    expenseArgs
  );

  const combined = [...taskRows, ...eventRows, ...expenseRows].map((item) => ({
    ...item,
    relevance: scoreSearchResult(item, params.query)
  }));

  const sorted = sortSearchResults(combined, params);
  return paginateResults(sorted, options?.cursor ?? null, options?.limit ?? 30);
}

export async function searchProject(projectId: string, params: SearchParams): Promise<SearchResult[]> {
  const page = await searchProjectPage(projectId, params, { limit: 150, cursor: null });
  return page.items;
}

export async function listExpenseCategories(projectId: string): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ category: string }>(
    `
      SELECT DISTINCT category
      FROM expenses
      WHERE project_id = ?
      ORDER BY category ASC
    `,
    [projectId]
  );
  return rows.map((row) => row.category);
}
