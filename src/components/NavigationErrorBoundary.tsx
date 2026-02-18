import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { appColors, radius, spacing, typography } from '@/theme/tokens';

type Props = {
  scope: string;
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
  resetKey: number;
};

export class NavigationErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    message: '',
    resetKey: 0
  };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unexpected render error'
    };
  }

  componentDidCatch(error: unknown): void {
    console.error(`Navigation boundary error (${this.props.scope})`, error);
  }

  onRetry = (): void => {
    this.setState((prev) => ({
      hasError: false,
      message: '',
      resetKey: prev.resetKey + 1
    }));
  };

  render(): React.JSX.Element {
    if (this.state.hasError) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>{this.props.scope} screen failed to render. You can retry this section.</Text>
          <Text style={styles.detail}>{this.state.message}</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={this.onRetry}
            accessibilityRole="button"
            accessibilityLabel="Retry section"
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: appColors.bg
  },
  title: {
    color: appColors.text,
    marginBottom: spacing.sm,
    ...typography.titleMd
  },
  subtitle: {
    color: appColors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
    ...typography.body
  },
  detail: {
    color: appColors.danger,
    textAlign: 'center',
    marginBottom: spacing.lg,
    ...typography.caption
  },
  retryBtn: {
    backgroundColor: appColors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  retryText: {
    color: appColors.buttonText,
    ...typography.bodyStrong
  }
});
