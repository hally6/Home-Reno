import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { SecondaryButton } from '@/components/SecondaryButton';

describe('SecondaryButton', () => {
  it('renders title text', () => {
    const { getByText } = render(<SecondaryButton title="Open Rooms" onPress={jest.fn()} />);
    expect(getByText('Open Rooms')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<SecondaryButton title="Open Rooms" onPress={onPress} />);
    fireEvent.press(getByText('Open Rooms'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
