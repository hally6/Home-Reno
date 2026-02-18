import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { appColors, radius, shadows, spacing, typography } from '@/theme/tokens';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type CardProps = {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightDotColor?: string;
  accentColor?: string;
  size?: 'compact' | 'default';
  headerRight?: React.ReactNode;
  children?: React.ReactNode;
  accessibilityLabel?: string;
};

export function Card({
  title,
  subtitle,
  onPress,
  rightDotColor,
  accentColor,
  size = 'default',
  headerRight,
  children,
  accessibilityLabel
}: CardProps): React.JSX.Element {
  const pressProgress = React.useRef(new Animated.Value(0)).current;
  const reduceMotion = useReducedMotion();
  const onPressIn = React.useCallback(() => {
    if (reduceMotion || process.env.NODE_ENV === 'test') {
      return;
    }
    Animated.timing(pressProgress, {
      toValue: 1,
      duration: 80,
      useNativeDriver: true
    }).start();
  }, [pressProgress, reduceMotion]);
  const onPressOut = React.useCallback(() => {
    if (reduceMotion || process.env.NODE_ENV === 'test') {
      return;
    }
    Animated.spring(pressProgress, {
      toValue: 0,
      friction: 8,
      tension: 160,
      useNativeDriver: true
    }).start();
  }, [pressProgress, reduceMotion]);
  const animatedStyle = React.useMemo(
    () => ({
      transform: [
        {
          scale: pressProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.98]
          })
        }
      ],
      opacity: pressProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.9]
      })
    }),
    [pressProgress]
  );
  const content = (
    <Animated.View
      style={[
        styles.container,
        size === 'compact' ? styles.containerCompact : null,
        accentColor ? { borderLeftWidth: 4, borderLeftColor: accentColor } : null,
        onPress && !reduceMotion ? animatedStyle : null
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, size === 'compact' ? styles.titleCompact : null]}>{title}</Text>
        {headerRight}
      </View>
      {!!subtitle && (
        <View style={styles.subtitleRow}>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {rightDotColor ? <View style={[styles.dot, { backgroundColor: rightDotColor }]} /> : null}
        </View>
      )}
      {children}
    </Animated.View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${title}${subtitle ? `. ${subtitle}` : ''}`}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: appColors.surface,
    borderColor: appColors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm
  },
  containerCompact: {
    padding: spacing.md
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  title: {
    ...typography.titleMd,
    color: appColors.text,
    flex: 1
  },
  titleCompact: {
    ...typography.bodyStrong
  },
  subtitle: {
    marginTop: 0,
    ...typography.body,
    color: appColors.textMuted,
    flex: 1
  },
  subtitleRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5
  }
});
