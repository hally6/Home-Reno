import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { appColors, spacing } from '@/theme/tokens';
import { Typography } from '@/components/Typography';

export function LoadingSpinner({
  label = 'Loading...'
}: {
  label?: string;
}): React.JSX.Element {
  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityLabel={label} accessibilityLiveRegion="polite">
      <ActivityIndicator size="small" color={appColors.primary} />
      <Typography variant="body" style={styles.label} color={appColors.textMuted}>
        {label}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  label: {
    marginLeft: spacing.sm
  }
});
