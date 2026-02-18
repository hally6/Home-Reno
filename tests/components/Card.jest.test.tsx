import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Card } from '@/components/Card';

describe('Card', () => {
  it('renders title and subtitle', () => {
    const { getByText } = render(<Card title="Room Budget" subtitle="Kitchen and bathroom" />);

    expect(getByText('Room Budget')).toBeTruthy();
    expect(getByText('Kitchen and bathroom')).toBeTruthy();
  });

  it('calls onPress when provided', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Card title="Open detail" onPress={onPress} />);

    fireEvent.press(getByText('Open detail'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('applies default accessibility label on pressable card', () => {
    const { getByLabelText } = render(<Card title="Open detail" subtitle="Room summary" onPress={jest.fn()} />);

    expect(getByLabelText('Open detail. Room summary')).toBeTruthy();
  });

  it('renders headerRight content when provided', () => {
    const { getByText } = render(<Card title="Budget" headerRight={<Text>Risk</Text>} />);

    expect(getByText('Budget')).toBeTruthy();
    expect(getByText('Risk')).toBeTruthy();
  });

  it('supports compact and accent variants', () => {
    const { getByText } = render(<Card title="Room Card" size="compact" accentColor="#0E6B56" />);

    expect(getByText('Room Card')).toBeTruthy();
  });
});
