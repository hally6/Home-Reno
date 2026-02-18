type FormatOptions = {
  locale?: string;
  timeZone?: string;
};

const ACRONYM_TOKENS = new Set(['api', 'id', 'uri', 'url', 'iso', 'hvac', 'usd', 'eur', 'gbp', 'cad', 'aud']);

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export function formatDateTime(value: string | null | undefined, options?: FormatOptions): string {
  if (!value) {
    return 'No date';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(options?.locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: options?.timeZone
  });
}

export function formatDate(value: string | null | undefined, options?: FormatOptions): string {
  if (!value) {
    return 'No date';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(options?.locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: options?.timeZone
  });
}

export function formatOptionLabel(value: string): string {
  if (value.trim().toLowerCase() === 'done') {
    return 'Complete';
  }

  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      const trimmed = word.trim();
      if (trimmed.toUpperCase() === trimmed && /^[A-Z0-9]+$/.test(trimmed) && trimmed.length <= 5) {
        return trimmed;
      }
      const normalized = trimmed.toLowerCase();
      if (ACRONYM_TOKENS.has(normalized)) {
        return normalized.toUpperCase();
      }
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .join(' ');
}

export function formatTime(hours: number, minutes: number, options?: Omit<FormatOptions, 'timeZone'>): string {
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return '--:--';
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return '--:--';
  }

  const date = new Date(Date.UTC(2000, 0, 1, hours, minutes, 0, 0));
  return date.toLocaleTimeString(options?.locale, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
}

export function calculateDaysUntilDue(dueAt: string | null | undefined, now: Date = new Date()): number | null {
  if (!dueAt) {
    return null;
  }
  const dueDate = new Date(dueAt);
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  return Math.floor((startOfDue.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
}

export function isOverdue(dueAt: string | null | undefined, status?: string | null, now: Date = new Date()): boolean {
  const normalizedStatus = (status ?? '').trim().toLowerCase();
  if (normalizedStatus === 'done' || normalizedStatus === 'complete') {
    return false;
  }
  if (!dueAt) {
    return false;
  }

  const dueDate = new Date(dueAt);
  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }
  return dueDate.getTime() < now.getTime();
}

export function formatBudgetVariance(planned: number, actual: number, currency: string = 'USD'): string {
  const variance = planned - actual;
  const absVariance = formatCurrency(Math.abs(variance), currency);
  if (variance > 0) {
    return `Under by ${absVariance}`;
  }
  if (variance < 0) {
    return `Over by ${absVariance}`;
  }
  return `On budget (${formatCurrency(0, currency)})`;
}

export type DueTrafficLight = 'Red' | 'Amber' | 'Green';

export function getDueTrafficLight(
  dueAt: string | null | undefined,
  status?: string | null,
  now: Date = new Date()
): DueTrafficLight {
  const normalizedStatus = (status ?? '').trim().toLowerCase();
  if (normalizedStatus === 'done' || normalizedStatus === 'complete') {
    return 'Green';
  }

  if (!dueAt) {
    return 'Amber';
  }
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) {
    return 'Amber';
  }

  const diffMs = due.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours <= 72) {
    return 'Red';
  }
  return 'Amber';
}
