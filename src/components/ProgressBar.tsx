import React from 'react';
import { Animated, Easing, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { appColors, typography } from '@/theme/tokens';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type ProgressBarProps = {
  value: number;
  label?: string;
  height?: number;
  style?: ViewStyle;
};

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

export function ProgressBar({ value, label, height = 6, style }: ProgressBarProps): React.JSX.Element {
  const clamped = clampPercent(value);
  const animatedValue = React.useRef(new Animated.Value(0)).current;
  const didAnimate = React.useRef(false);
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    if (process.env.NODE_ENV === 'test' || reduceMotion) {
      didAnimate.current = true;
      animatedValue.setValue(clamped);
      return;
    }
    if (!didAnimate.current) {
      didAnimate.current = true;
      Animated.timing(animatedValue, {
        toValue: clamped,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false
      }).start();
      return;
    }
    animatedValue.setValue(clamped);
  }, [animatedValue, clamped, reduceMotion]);

  const width = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%']
  });

  return (
    <View style={[styles.row, style]}>
      <View
        testID="progressbar-track"
        style={[styles.track, { height, borderRadius: height / 2 }]}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      >
        <Animated.View style={[styles.fill, { width, borderRadius: height / 2 }]} />
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  track: {
    flex: 1,
    backgroundColor: appColors.surfaceMuted,
    overflow: 'hidden'
  },
  fill: {
    height: '100%',
    backgroundColor: appColors.primary
  },
  label: {
    ...typography.captionStrong,
    color: appColors.textMuted,
    minWidth: 34,
    textAlign: 'right'
  }
});
