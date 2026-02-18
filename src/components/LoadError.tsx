import React from 'react';
import { View } from 'react-native';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';

export function LoadError({
  title,
  message,
  onRetry
}: {
  title: string;
  message?: string;
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" accessibilityLabel={`${title}. ${message ?? 'Could not load data. Please try again.'}`}>
      <Card title={title} subtitle={message ?? 'Could not load data. Please try again.'} />
      <PrimaryButton title="Retry" onPress={onRetry} />
    </View>
  );
}
