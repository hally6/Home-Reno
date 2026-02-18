import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRecommendedTasks, type NextTaskCandidate } from '../src/data/repositories/nextTaskRules';

function task(
  input: Partial<NextTaskCandidate> & Pick<NextTaskCandidate, 'id' | 'title' | 'roomName'>
): NextTaskCandidate {
  return {
    id: input.id,
    title: input.title,
    roomName: input.roomName,
    status: input.status ?? 'ready',
    phase: input.phase ?? 'plan',
    dueAt: input.dueAt ?? null,
    priority: input.priority ?? 'medium',
    sortIndex: input.sortIndex ?? 1,
    updatedAt: input.updatedAt ?? '2026-02-10T10:00:00.000Z'
  };
}

test('buildRecommendedTasks prioritizes overdue and in-progress items', () => {
  const now = new Date('2026-02-10T10:00:00.000Z');
  const result = buildRecommendedTasks(
    [
      task({
        id: 'a',
        title: 'Paint wall',
        roomName: 'Kitchen',
        status: 'in_progress',
        dueAt: '2026-02-10T12:00:00.000Z'
      }),
      task({
        id: 'b',
        title: 'Order tiles',
        roomName: 'Kitchen',
        status: 'ready',
        dueAt: '2026-02-09T12:00:00.000Z',
        priority: 'high'
      }),
      task({ id: 'c', title: 'Research taps', roomName: 'Kitchen', status: 'ideas' })
    ],
    now,
    3
  );
  assert.equal(result.length, 3);
  assert.equal(result[0].id, 'b');
  assert.match(result[0].reasons.join(' '), /Overdue/i);
});

test('buildRecommendedTasks excludes waiting and done tasks', () => {
  const now = new Date('2026-02-10T10:00:00.000Z');
  const result = buildRecommendedTasks(
    [
      task({ id: 'a', title: 'Waiting task', roomName: 'Bathroom', status: 'waiting' }),
      task({ id: 'b', title: 'Done task', roomName: 'Bathroom', status: 'done' }),
      task({ id: 'c', title: 'Ready task', roomName: 'Bathroom', status: 'ready' })
    ],
    now,
    3
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'c');
});

test('buildRecommendedTasks penalizes out-of-sequence phase work', () => {
  const now = new Date('2026-02-10T10:00:00.000Z');
  const result = buildRecommendedTasks(
    [
      task({ id: 'plan', title: 'Plan scope', roomName: 'Bedroom', status: 'ready', phase: 'plan' }),
      task({
        id: 'install',
        title: 'Install trim',
        roomName: 'Bedroom',
        status: 'ready',
        phase: 'install',
        priority: 'high'
      })
    ],
    now,
    2
  );
  assert.equal(result[0].id, 'plan');
  assert.match(result[1].reasons.join(' '), /Earlier phase/i);
});
