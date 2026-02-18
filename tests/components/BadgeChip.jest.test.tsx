import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { BadgeChip } from '@/components/BadgeChip';

describe('BadgeChip', () => {
  it('renders label', () => {
    const { getByText } = render(<BadgeChip label="Overdue 2" tone="danger" />);
    expect(getByText('Overdue 2')).toBeTruthy();
  });

  it('supports press handler when provided', () => {
    const onPress = jest.fn();
    const { getByText } = render(<BadgeChip label="Due 1" onPress={onPress} />);
    fireEvent.press(getByText('Due 1'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
