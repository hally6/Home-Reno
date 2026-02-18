import { getDatabase } from '@/data/database';
import { createId } from '@/data/id';
import { validateExpenseInput } from './expenseRules';

export type BudgetOverview = {
  planned: number;
  actual: number;
  currency: string;
  byRoom: Array<{ roomName: string; amount: number }>;
  byCategory: Array<{ category: string; amount: number }>;
};

export type ExpenseListItem = {
  id: string;
  amount: number;
  category: string;
  vendor: string | null;
  incurredOn: string;
  roomName: string | null;
};

export type ExpenseDetail = {
  id: string;
  projectId: string;
  roomId: string | null;
  taskId: string | null;
  amount: number;
  category: string;
  vendor: string | null;
  taxAmount: number | null;
  incurredOn: string;
  notes: string | null;
  roomName: string | null;
  taskTitle: string | null;
};

export type ExpenseFormInput = {
  projectId: string;
  roomId: string | null;
  taskId: string | null;
  category: string;
  vendor: string;
  amount: number;
  taxAmount: number | null;
  incurredOn: string;
  notes: string;
};

export async function getBudgetOverview(projectId: string): Promise<BudgetOverview> {
  const db = await getDatabase();

  const totals = await db.getFirstAsync<{ planned: number; actual: number; currency: string }>(
    `
      SELECT
        CASE
          WHEN COALESCE(p.budget_planned_total, 0) > 0 THEN p.budget_planned_total
          ELSE COALESCE((SELECT SUM(r.budget_planned) FROM rooms r WHERE r.project_id = p.id), 0)
        END AS planned,
        COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.project_id = p.id), 0) AS actual,
        p.currency AS currency
      FROM projects p
      WHERE p.id = ?
      LIMIT 1
    `,
    [projectId]
  );

  const byRoom = await db.getAllAsync<{ roomName: string; amount: number }>(
    `
      SELECT
        COALESCE(r.name, 'Unassigned') AS roomName,
        SUM(e.amount) AS amount
      FROM expenses e
      LEFT JOIN rooms r ON r.id = e.room_id
      WHERE e.project_id = ?
      GROUP BY COALESCE(r.name, 'Unassigned')
      ORDER BY amount DESC
    `,
    [projectId]
  );

  const byCategory = await db.getAllAsync<{ category: string; amount: number }>(
    `
      SELECT category, SUM(amount) AS amount
      FROM expenses
      WHERE project_id = ?
      GROUP BY category
      ORDER BY amount DESC
    `,
    [projectId]
  );

  return {
    planned: Number(totals?.planned ?? 0),
    actual: Number(totals?.actual ?? 0),
    currency: totals?.currency ?? 'USD',
    byRoom: byRoom.map((x) => ({ roomName: x.roomName, amount: Number(x.amount ?? 0) })),
    byCategory: byCategory.map((x) => ({ category: x.category, amount: Number(x.amount ?? 0) }))
  };
}

export async function getRecentExpenses(projectId: string): Promise<ExpenseListItem[]> {
  const db = await getDatabase();

  const items = await db.getAllAsync<ExpenseListItem>(
    `
      SELECT
        e.id,
        e.amount,
        e.category,
        e.vendor,
        e.incurred_on AS incurredOn,
        r.name AS roomName
      FROM expenses e
      LEFT JOIN rooms r ON r.id = e.room_id
      WHERE e.project_id = ?
      ORDER BY e.incurred_on DESC, e.created_at DESC
      LIMIT 20
    `,
    [projectId]
  );

  return items.map((x) => ({ ...x, amount: Number(x.amount ?? 0) }));
}

export async function getExpenseDetail(expenseId: string): Promise<ExpenseDetail | null> {
  const db = await getDatabase();

  const expense = await db.getFirstAsync<ExpenseDetail>(
    `
      SELECT
        e.id,
        e.project_id AS projectId,
        e.room_id AS roomId,
        e.task_id AS taskId,
        e.amount,
        e.category,
        e.vendor,
        e.tax_amount AS taxAmount,
        e.incurred_on AS incurredOn,
        e.notes,
        r.name AS roomName,
        t.title AS taskTitle
      FROM expenses e
      LEFT JOIN rooms r ON r.id = e.room_id
      LEFT JOIN tasks t ON t.id = e.task_id
      WHERE e.id = ?
      LIMIT 1
    `,
    [expenseId]
  );

  if (!expense) {
    return null;
  }

  return {
    ...expense,
    amount: Number(expense.amount ?? 0),
    taxAmount: expense.taxAmount == null ? null : Number(expense.taxAmount)
  };
}

export async function createExpense(input: ExpenseFormInput): Promise<string> {
  validateExpenseInput(input);
  const db = await getDatabase();
  const now = new Date().toISOString();
  const expenseId = createId('expense');

  await db.runAsync(
    `
      INSERT INTO expenses (
        id, project_id, room_id, task_id, category, vendor, amount, tax_amount,
        incurred_on, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      expenseId,
      input.projectId,
      input.roomId,
      input.taskId,
      input.category,
      input.vendor.trim() || null,
      input.amount,
      input.taxAmount,
      input.incurredOn,
      input.notes.trim() || null,
      now,
      now
    ]
  );

  return expenseId;
}

export async function updateExpense(expenseId: string, input: ExpenseFormInput): Promise<void> {
  validateExpenseInput(input);
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `
      UPDATE expenses
      SET room_id = ?, task_id = ?, category = ?, vendor = ?, amount = ?, tax_amount = ?,
          incurred_on = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `,
    [
      input.roomId,
      input.taskId,
      input.category,
      input.vendor.trim() || null,
      input.amount,
      input.taxAmount,
      input.incurredOn,
      input.notes.trim() || null,
      now,
      expenseId
    ]
  );
}

export async function deleteExpense(expenseId: string, projectId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM expenses WHERE id = ? AND project_id = ?`, [expenseId, projectId]);
}
