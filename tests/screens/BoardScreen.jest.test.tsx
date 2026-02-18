import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';

import { BoardScreen } from '@/screens/home/BoardScreen';

const mockUseAppContext = jest.fn();
const mockUseQuery = jest.fn();

jest.mock('@/state/AppContext', () => ({
  useAppContext: () => mockUseAppContext()
}));

jest.mock('@/hooks/useQuery', () => ({
  useQuery: () => mockUseQuery()
}));

describe('BoardScreen', () => {
  const navigation = {
    navigate: jest.fn()
  };

  beforeEach(() => {
    navigation.navigate.mockReset();
    mockUseAppContext.mockReset();
    mockUseQuery.mockReset();
    mockUseAppContext.mockReturnValue({ projectId: 'project_1', refreshToken: 1 });
  });

  it('renders horizontal board and empty placeholder copy', () => {
    mockUseQuery.mockReturnValue({
      data: {
        ideas: [],
        ready: [{ id: 't1', title: 'Task 1', status: 'ready', phase: 'planning', waitingReason: null, dueAt: null, roomName: 'Kitchen' }],
        in_progress: [],
        waiting: [],
        done: []
      },
      error: '',
      reload: jest.fn()
    });

    const { getAllByText, getByTestId } = render(
      <BoardScreen navigation={navigation as any} route={{ key: 'k', name: 'Board' } as any} />
    );

    expect(getByTestId('board-horizontal-scroll')).toBeTruthy();
    expect(getAllByText('No tasks').length).toBeGreaterThan(0);
    expect(getAllByText('Drop tasks here or create a new one').length).toBeGreaterThan(0);
  });
});
