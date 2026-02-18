import React from 'react';
import { Text, type TextStyle, type StyleProp } from 'react-native';
import { appColors, typography } from '@/theme/tokens';

type Variant = keyof typeof typography;

export function Typography({
  children,
  variant = 'body',
  style,
  color
}: {
  children: React.ReactNode;
  variant?: Variant;
  style?: StyleProp<TextStyle>;
  color?: string;
}): React.JSX.Element {
  return (
    <Text style={[typography[variant], { color: color ?? appColors.text }, style]}>
      {children}
    </Text>
  );
}
