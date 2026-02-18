import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { appColors, radius, spacing, typography } from '@/theme/tokens';

export function PrimaryButton({
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
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: appColors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md
  },
  text: {
    color: appColors.buttonText,
    ...typography.bodyStrong
  },
  disabled: {
    opacity: 0.5
  }
});
