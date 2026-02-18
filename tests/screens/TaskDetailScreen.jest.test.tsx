import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, waitFor } from '@testing-library/react-native';

import { TaskDetailScreen } from '@/screens/home/TaskDetailScreen';
import type { TaskDetail } from '@/data/repositories/taskRepository';

const mockGetTaskDetail = jest.fn<(taskId: string) => Promise<TaskDetail | null>>();

jest.mock('@/data/repositories/taskRepository', () => ({
  getTaskDetail: (...args: Parameters<typeof mockGetTaskDetail>) => mockGetTaskDetail(...args)
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

describe('TaskDetailScreen', () => {
  const navigation = {
    navigate: jest.fn()
  };

  const baseProps = {
    navigation,
    route: { key: 'TaskDetail-1', name: 'TaskDetail' as const, params: { taskId: 'task_1' } }
  };

  beforeEach(() => {
    mockGetTaskDetail.mockReset();
    navigation.navigate.mockReset();
  });

  it('shows loading state while detail query is pending', () => {
    mockGetTaskDetail.mockReturnValue(new Promise(() => undefined));

    const { getByText } = render(<TaskDetailScreen {...(baseProps as any)} />);

    expect(getByText('Loading task...')).toBeTruthy();
  });

  it('shows error state when detail load fails', async () => {
    mockGetTaskDetail.mockRejectedValue(new Error('Network down'));

    const { getByText } = render(<TaskDetailScreen {...(baseProps as any)} />);

    await waitFor(() => expect(getByText('Task unavailable')).toBeTruthy());
  });

  it('renders task detail when query succeeds', async () => {
    mockGetTaskDetail.mockResolvedValue({
      id: 'task_1',
      roomId: 'room_1',
      title: 'Install vanity',
      description: null,
      roomName: 'Bathroom',
      phase: 'install',
      status: 'ready',
      waitingReason: null,
      dueAt: '2026-02-20T10:00:00.000Z',
      startAt: '2026-02-19T10:00:00.000Z',
      priority: 'high',
      estimateLabor: null,
      estimateMaterials: null,
      actualLabor: null,
      actualMaterials: null,
      tradeTags: ['plumber'],
      customTags: []
    });

    const { getByText } = render(<TaskDetailScreen {...(baseProps as any)} />);

    await waitFor(() => expect(getByText('Install vanity')).toBeTruthy());
  });
});
