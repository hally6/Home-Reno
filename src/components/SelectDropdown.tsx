import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { appColors, radius, spacing, typography } from '@/theme/tokens';

type SelectOption = {
  value: string;
  label: string;
};

type SelectDropdownProps = {
  label: string;
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
};

export function SelectDropdown({
  label,
  value,
  options,
  placeholder,
  onChange
}: SelectDropdownProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen((prev) => !prev)}
        style={styles.trigger}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${selected?.label ?? placeholder ?? 'Select option'}`}
        accessibilityState={{ expanded: open }}
      >
        <Text style={[styles.triggerText, !selected && styles.placeholder]}>
          {selected?.label ?? placeholder ?? 'Select...'}
        </Text>
        <Text style={styles.chevron}>{open ? '^' : 'v'}</Text>
      </Pressable>
      {open ? (
        <View style={styles.menu}>
          {options.map((option) => (
            <Pressable
              key={option.value || '__empty__'}
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
              style={[styles.option, value === option.value && styles.optionSelected]}
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${option.label}`}
              accessibilityState={{ selected: value === option.value }}
            >
              <Text style={styles.optionText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
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
  trigger: {
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  triggerText: {
    color: appColors.text,
    ...typography.body
  },
  placeholder: {
    color: appColors.textMuted
  },
  chevron: {
    color: appColors.textMuted,
    marginLeft: spacing.md
  },
  menu: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: radius.md,
    overflow: 'hidden'
  },
  option: {
    backgroundColor: appColors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: appColors.border
  },
  optionSelected: {
    backgroundColor: appColors.surfaceMuted
  },
  optionText: {
    color: appColors.text,
    ...typography.body
  }
});
