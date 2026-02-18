import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';

import { HomeDashboardScreen } from '@/screens/home/HomeDashboardScreen';

const mockUseAppContext = jest.fn();
const mockUseQuery = jest.fn();

jest.mock('@/state/AppContext', () => ({
  useAppContext: () => mockUseAppContext()
}));

jest.mock('@/hooks/useQuery', () => ({
  useQuery: () => mockUseQuery()
}));

describe('HomeDashboardScreen', () => {
  const navigation = {
    navigate: jest.fn()
  };

  beforeEach(() => {
    navigation.navigate.mockReset();
    mockUseAppContext.mockReset();
    mockUseQuery.mockReset();
    mockUseAppContext.mockReturnValue({ projectId: 'project_1', refreshToken: 1 });
  });

  it('renders dashboard snapshot content', () => {
    mockUseQuery.mockReturnValue({
      data: {
        projectName: 'Home Planner',
        homeLayout: 'standard',
        overallProgress: 42,
        todayCounts: { overdue: 1, dueToday: 2, waiting: 0, next: 3 },
        topRecommendedTasks: [],
        roomsSummary: '3 rooms',
        budgetActual: 1000,
        budgetPlanned: 3000,
        currency: 'USD',
        costRisk: 'low',
        upcomingSummary: 'No upcoming events',
        totalTaskCount: 6
      },
      error: '',
      reload: jest.fn()
    });

    const { getByText } = render(
      <HomeDashboardScreen navigation={navigation as any} route={{ key: 'k', name: 'HomeDashboard' } as any} />
    );

    expect(getByText('Action hub')).toBeTruthy();
    expect(getByText('Rooms')).toBeTruthy();
    expect(getByText('Budget')).toBeTruthy();
  });

  it('renders retry state when query has error', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      error: 'Failed to load dashboard',
      reload: jest.fn()
    });

    const { getByText } = render(
      <HomeDashboardScreen navigation={navigation as any} route={{ key: 'k', name: 'HomeDashboard' } as any} />
    );

    expect(getByText('Dashboard unavailable')).toBeTruthy();
    expect(getByText('Retry')).toBeTruthy();
  });
});
