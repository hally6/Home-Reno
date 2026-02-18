import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';

import { ProgressBar } from '@/components/ProgressBar';

describe('ProgressBar', () => {
  it('renders accessibility progress info and optional label', () => {
    const { getByTestId, getByText } = render(<ProgressBar value={45} label="45%" />);

    expect(getByTestId('progressbar-track')).toBeTruthy();
    expect(getByText('45%')).toBeTruthy();
  });
});
