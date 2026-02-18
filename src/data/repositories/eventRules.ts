import { assertMaxLength, INPUT_LIMITS } from './inputLimits';

const MIN_EVENT_YEAR = 2000;
const MAX_EVENT_YEAR = 2100;

function parseIsoDate(value: string): Date | null {
  const isoLike = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?(Z|[+-]\d{2}:\d{2})$/;
  if (!isoLike.test(value)) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export type EventInputForRules = {
  type?: string;
  title: string;
  startsAt: string;
  company?: string;
  contactName?: string;
  contactPhone?: string;
};

export function validateEventInput(input: EventInputForRules): void {
  if (!input.title.trim()) {
    throw new Error('Event title is required');
  }
  assertMaxLength(input.type, INPUT_LIMITS.eventType, 'Event type');
  assertMaxLength(input.title, INPUT_LIMITS.eventTitle, 'Event title');
  assertMaxLength(input.company, INPUT_LIMITS.eventCompany, 'Company');
  assertMaxLength(input.contactName, INPUT_LIMITS.eventContactName, 'Contact name');
  assertMaxLength(input.contactPhone, INPUT_LIMITS.eventContactPhone, 'Contact phone');
  if (!input.startsAt) {
    throw new Error('Event start is required');
  }

  const startsAt = parseIsoDate(input.startsAt);
  if (!startsAt) {
    throw new Error('Event start must be a valid ISO datetime');
  }

  const year = startsAt.getUTCFullYear();
  if (year < MIN_EVENT_YEAR || year > MAX_EVENT_YEAR) {
    throw new Error(`Event start year must be between ${MIN_EVENT_YEAR} and ${MAX_EVENT_YEAR}`);
  }
}
