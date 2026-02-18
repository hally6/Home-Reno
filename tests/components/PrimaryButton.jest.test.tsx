import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { PrimaryButton } from '@/components/PrimaryButton';

describe('PrimaryButton', () => {
  it('renders the title text', () => {
    const { getByText } = render(<PrimaryButton title="Save changes" onPress={jest.fn()} />);

    expect(getByText('Save changes')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<PrimaryButton title="Submit" onPress={onPress} />);

    fireEvent.press(getByText('Submit'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<PrimaryButton title="Disabled" onPress={onPress} disabled />);

    fireEvent.press(getByText('Disabled'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('applies default accessibility label from title', () => {
    const { getByLabelText } = render(<PrimaryButton title="Save project" onPress={jest.fn()} />);

    expect(getByLabelText('Save project')).toBeTruthy();
  });
});
