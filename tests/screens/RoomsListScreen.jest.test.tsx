import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';

import { RoomsListScreen } from '@/screens/rooms/RoomsListScreen';

const mockUseAppContext = jest.fn();
const mockUseQuery = jest.fn();

jest.mock('@/state/AppContext', () => ({
  useAppContext: () => mockUseAppContext()
}));

jest.mock('@/hooks/useQuery', () => ({
  useQuery: () => mockUseQuery()
}));

describe('RoomsListScreen', () => {
  const navigation = {
    navigate: jest.fn()
  };

  beforeEach(() => {
    navigation.navigate.mockReset();
    mockUseAppContext.mockReset();
    mockUseQuery.mockReset();
    mockUseAppContext.mockReturnValue({
      projectId: 'project_1',
      refreshToken: 1,
      refreshData: jest.fn()
    });
  });

  it('renders identity and status chips for each room card', () => {
    mockUseQuery.mockReturnValue({
      data: [
        {
          id: 'room_1',
          name: 'Living Room',
          type: 'living_room',
          floor: 'ground_floor',
          status: 'active',
          blockedCount: 1,
          doneCount: 3,
          totalCount: 6,
          nextTaskTitle: 'Install shelving'
        }
      ],
      error: '',
      reload: jest.fn()
    });

    const { getByText } = render(
      <RoomsListScreen navigation={navigation as any} route={{ key: 'k', name: 'RoomsList' } as any} />
    );

    expect(getByText('LR')).toBeTruthy();
    expect(getByText('Blocked 1')).toBeTruthy();
    expect(getByText('In Progress 2')).toBeTruthy();
    expect(getByText('Done 3')).toBeTruthy();
  });
});
