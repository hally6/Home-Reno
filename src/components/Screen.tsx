import React from 'react';
import { ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { appColors, spacing } from '@/theme/tokens';

type ScreenProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function Screen({ children, style }: ScreenProps): React.JSX.Element {
  return (
    <ScrollView
      contentContainerStyle={[styles.content, style]}
      style={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.bg
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2
  }
});
