import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';

import { EmptyState } from '@/components/EmptyState';

describe('EmptyState', () => {
  it('renders title and description', () => {
    const { getByText } = render(
      <EmptyState icon="home-outline" title="No rooms yet" description="Create your first room to start planning." />
    );

    expect(getByText('No rooms yet')).toBeTruthy();
    expect(getByText('Create your first room to start planning.')).toBeTruthy();
  });
});
