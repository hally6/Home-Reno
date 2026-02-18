import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { appColors, radius, spacing, typography } from '@/theme/tokens';

export function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric';
}): React.JSX.Element {
  const labelId = React.useMemo(() => `form-input-label-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, [label]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label} nativeID={labelId}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[styles.input, multiline && styles.multi]}
        accessibilityLabel={label}
        accessibilityLabelledBy={labelId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md
  },
  label: {
    color: appColors.text,
    marginBottom: spacing.xs,
    ...typography.bodyStrong
  },
  input: {
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: appColors.text,
    ...typography.body
  },
  multi: {
    minHeight: 90,
    textAlignVertical: 'top'
  }
});
