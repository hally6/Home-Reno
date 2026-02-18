import React from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render, waitFor } from '@testing-library/react-native';

import { SearchFiltersScreen } from '@/screens/home/SearchFiltersScreen';

const mockListProjectRooms = jest.fn<(projectId: string) => Promise<Array<{ id: string; name: string }>>>();
const mockListExpenseCategories = jest.fn<(projectId: string) => Promise<string[]>>();
const mockSearchProjectPage = jest.fn<
  (projectId: string, params: unknown, options: unknown) => Promise<{ items: unknown[]; nextCursor: string | null }>
>();
const mockUseAppContext = jest.fn();

jest.mock('@/state/AppContext', () => ({
  useAppContext: () => mockUseAppContext()
}));

jest.mock('@/data/repositories/projectRepository', () => ({
  listProjectRooms: (projectId: string) => mockListProjectRooms(projectId)
}));

jest.mock('@/data/repositories/searchRepository', () => ({
  listExpenseCategories: (projectId: string) => mockListExpenseCategories(projectId),
  searchProjectPage: (projectId: string, params: unknown, options: unknown) =>
    mockSearchProjectPage(projectId, params, options)
}));

jest.mock('@react-navigation/native', () => {
  const ReactRuntime = require('react') as typeof React;
  const actual = jest.requireActual('@react-navigation/native') as Record<string, unknown>;
  return {
    ...actual,
    useFocusEffect: (effect: () => void | (() => void)) => {
      ReactRuntime.useEffect(() => effect(), [effect]);
    }
  };
});

describe('SearchFiltersScreen', () => {
  const navigation = {
    navigate: jest.fn()
  };

  beforeEach(() => {
    jest.useFakeTimers();
    navigation.navigate.mockReset();
    mockUseAppContext.mockReset();
    mockListProjectRooms.mockReset();
    mockListExpenseCategories.mockReset();
    mockSearchProjectPage.mockReset();
    mockUseAppContext.mockReturnValue({ projectId: 'project_1', refreshToken: 1 });
    mockListProjectRooms.mockResolvedValue([]);
    mockListExpenseCategories.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs search and renders result rows', async () => {
    mockSearchProjectPage.mockResolvedValue({
      items: [
        {
          kind: 'task',
          id: 'task_1',
          title: 'Install vanity',
          roomName: 'Bathroom',
          date: '2026-02-20T10:00:00.000Z',
          updatedAt: '2026-02-19T10:00:00.000Z',
          relevance: 100,
          status: 'ready',
          phase: 'install'
        }
      ],
      nextCursor: null
    });

    const { getByText } = render(
      <SearchFiltersScreen
        navigation={navigation as any}
        route={{ key: 'k', name: 'SearchFilters', params: { initialQuery: 'vanity' } } as any}
      />
    );

    await act(async () => {
      jest.advanceTimersByTime(350);
      await Promise.resolve();
    });

    await waitFor(() => expect(getByText('Task: Install vanity')).toBeTruthy());
  });

  it('shows empty-state message when no matches', async () => {
    mockSearchProjectPage.mockResolvedValue({ items: [], nextCursor: null });

    const { getByText } = render(
      <SearchFiltersScreen navigation={navigation as any} route={{ key: 'k', name: 'SearchFilters' } as any} />
    );

    await act(async () => {
      jest.advanceTimersByTime(350);
      await Promise.resolve();
    });

    await waitFor(() => expect(getByText('No results found')).toBeTruthy());
  });
});
