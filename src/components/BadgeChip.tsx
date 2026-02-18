import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { appColors, radius, spacing } from '@/theme/tokens';
import { Typography } from '@/components/Typography';

type ChipTone = 'danger' | 'accent' | 'primary' | 'neutral';

const toneStyles: Record<ChipTone, { backgroundColor: string; textColor: string }> = {
  danger: { backgroundColor: '#FDECEC', textColor: appColors.text },
  accent: { backgroundColor: '#FFF2E6', textColor: appColors.text },
  primary: { backgroundColor: '#E6F3EF', textColor: appColors.text },
  neutral: { backgroundColor: appColors.surfaceMuted, textColor: appColors.text }
};

export function BadgeChip({
  label,
  tone = 'neutral',
  onPress
}: {
  label: string;
  tone?: ChipTone;
  onPress?: () => void;
}): React.JSX.Element {
  const content = (
    <View style={[styles.base, { backgroundColor: toneStyles[tone].backgroundColor }]}>
      <Typography variant="captionStrong" style={{ color: toneStyles[tone].textColor }}>
        {label}
      </Typography>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  }
});
