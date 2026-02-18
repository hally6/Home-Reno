import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { appColors, spacing, typography } from '@/theme/tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type EmptyStateProps = {
  icon: IconName;
  title: string;
  description: string;
  children?: React.ReactNode;
  style?: ViewStyle;
};

export function EmptyState({ icon, title, description, children, style }: EmptyStateProps): React.JSX.Element {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name={icon} size={48} color={appColors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg
  },
  title: {
    ...typography.titleMd,
    color: appColors.text,
    marginTop: spacing.sm
  },
  description: {
    ...typography.body,
    color: appColors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center'
  },
  actions: {
    marginTop: spacing.md,
    width: '100%'
  }
});
