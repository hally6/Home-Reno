import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';

import { Typography } from '@/components/Typography';

describe('Typography', () => {
  it('renders text with selected variant', () => {
    const { getByText } = render(<Typography variant="titleMd">Section Header</Typography>);
    expect(getByText('Section Header')).toBeTruthy();
  });
});
