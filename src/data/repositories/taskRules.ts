import { assertMaxLength, INPUT_LIMITS } from './inputLimits';

export type TaskInputForRules = {
  roomId: string;
  title: string;
  description?: string;
  phase?: string;
  status: string;
  priority?: string;
  waitingReason: string | null;
  tradeTags: string[];
  customTags: string[];
};

export function normalizeTagNames(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const name = raw.trim().toLowerCase();
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    result.push(name);
  }
  return result;
}

export function validateTaskInput(input: TaskInputForRules): void {
  if (!input.title.trim()) {
    throw new Error('Task title is required');
  }
  assertMaxLength(input.title, INPUT_LIMITS.taskTitle, 'Task title');
  assertMaxLength(input.description, INPUT_LIMITS.taskDescription, 'Task description');
  assertMaxLength(input.phase, INPUT_LIMITS.roomType, 'Task phase');
  assertMaxLength(input.status, INPUT_LIMITS.roomType, 'Task status');
  assertMaxLength(input.priority, INPUT_LIMITS.roomType, 'Task priority');
  if (!input.roomId) {
    throw new Error('Room is required');
  }
  if (input.status === 'waiting' && !input.waitingReason) {
    throw new Error('Waiting reason is required when status is waiting');
  }
  assertMaxLength(input.waitingReason, INPUT_LIMITS.waitingReason, 'Waiting reason');
  input.tradeTags = normalizeTagNames(input.tradeTags);
  input.customTags = normalizeTagNames(input.customTags);
  for (const tag of input.tradeTags) {
    assertMaxLength(tag, INPUT_LIMITS.tagName, 'Tag name');
  }
  for (const tag of input.customTags) {
    assertMaxLength(tag, INPUT_LIMITS.tagName, 'Tag name');
  }
}
