import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { LoadError } from '@/components/LoadError';

describe('LoadError', () => {
  it('renders alert message and retry action', () => {
    const onRetry = jest.fn();
    const { getByText, getByLabelText } = render(
      <LoadError title="Dashboard unavailable" message="Failed to load dashboard" onRetry={onRetry} />
    );

    expect(getByText('Dashboard unavailable')).toBeTruthy();
    expect(getByText('Failed to load dashboard')).toBeTruthy();
    expect(getByLabelText('Dashboard unavailable. Failed to load dashboard')).toBeTruthy();

    fireEvent.press(getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
