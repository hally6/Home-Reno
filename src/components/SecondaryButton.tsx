import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { appColors, radius, spacing } from '@/theme/tokens';
import { Typography } from '@/components/Typography';

export function SecondaryButton({
  title,
  onPress,
  disabled,
  accessibilityLabel
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}): React.JSX.Element {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: Boolean(disabled) }}
    >
      <Typography variant="bodyStrong" style={styles.text}>
        {title}
      </Typography>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: radius.md,
    backgroundColor: appColors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md
  },
  text: {
    color: appColors.text
  },
  disabled: {
    opacity: 0.5
  }
});
