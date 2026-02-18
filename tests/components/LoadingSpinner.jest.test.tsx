import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';

import { LoadingSpinner } from '@/components/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders default loading label', () => {
    const { getByText } = render(<LoadingSpinner />);
    expect(getByText('Loading...')).toBeTruthy();
  });
});
