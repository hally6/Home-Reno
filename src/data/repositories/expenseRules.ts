import { assertMaxLength, INPUT_LIMITS } from './inputLimits';

const MAX_EXPENSE_AMOUNT = 1_000_000;

export type ExpenseInputForRules = {
  category?: string;
  vendor?: string;
  amount: number;
  incurredOn: string;
  notes?: string;
};

export function validateExpenseInput(input: ExpenseInputForRules): void {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Expense amount must be greater than 0');
  }
  if (input.amount > MAX_EXPENSE_AMOUNT) {
    throw new Error(`Expense amount must be ${MAX_EXPENSE_AMOUNT.toLocaleString()} or less`);
  }
  assertMaxLength(input.category, INPUT_LIMITS.expenseCategory, 'Expense category');
  assertMaxLength(input.vendor, INPUT_LIMITS.expenseVendor, 'Expense vendor');
  assertMaxLength(input.notes, INPUT_LIMITS.expenseNotes, 'Expense notes');
  if (!input.incurredOn) {
    throw new Error('Expense date is required');
  }
}
