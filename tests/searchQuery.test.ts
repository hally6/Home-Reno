import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreSearchResult,
  sortSearchResults,
  type SearchParams,
  type SearchResult
} from '../src/data/repositories/searchQuery';

const baseParams: SearchParams = {
  query: 'kitchen',
  roomId: null,
  status: null,
  phase: null,
  category: null,
  dateFrom: null,
  dateTo: null,
  sortBy: 'relevance'
};

test('scoreSearchResult favors exact title matches', () => {
  const exact: SearchResult = {
    kind: 'task',
    id: 't1',
    title: 'Kitchen',
    roomName: 'Main',
    date: null,
    updatedAt: null,
    relevance: 0,
    status: 'ready',
    phase: 'plan'
  };
  const contains: SearchResult = {
    kind: 'task',
    id: 't2',
    title: 'Paint kitchen walls',
    roomName: 'Main',
    date: null,
    updatedAt: null,
    relevance: 0,
    status: 'ready',
    phase: 'plan'
  };

  assert.ok(scoreSearchResult(exact, baseParams.query) > scoreSearchResult(contains, baseParams.query));
});

test('sortSearchResults sorts by relevance first when requested', () => {
  const results: SearchResult[] = [
    {
      kind: 'event',
      id: 'e1',
      title: 'Plumber visit',
      roomName: 'Kitchen',
      date: '2026-02-10T09:00:00.000Z',
      updatedAt: '2026-02-08T09:00:00.000Z',
      relevance: 20,
      subtype: 'trade_visit'
    },
    {
      kind: 'expense',
      id: 'x1',
      title: 'tiles',
      roomName: 'Bathroom',
      date: '2026-02-12',
      updatedAt: '2026-02-09T09:00:00.000Z',
      relevance: 0,
      subtype: 'materials',
      amount: 200
    }
  ];

  const sorted = sortSearchResults(results, baseParams);
  assert.equal(sorted[0].id, 'e1');
});

test('sortSearchResults honors updated sort mode', () => {
  const results: SearchResult[] = [
    {
      kind: 'task',
      id: 't1',
      title: 'Install sink',
      roomName: 'Kitchen',
      date: '2026-02-10',
      updatedAt: '2026-02-08T08:00:00.000Z',
      relevance: 10,
      status: 'ready',
      phase: 'install'
    },
    {
      kind: 'task',
      id: 't2',
      title: 'Install tap',
      roomName: 'Kitchen',
      date: '2026-02-09',
      updatedAt: '2026-02-09T08:00:00.000Z',
      relevance: 5,
      status: 'ready',
      phase: 'install'
    }
  ];

  const sorted = sortSearchResults(results, { ...baseParams, sortBy: 'updated' });
  assert.equal(sorted[0].id, 't2');
});
