import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { appColors, radius, spacing, typography } from '@/theme/tokens';
import { formatDate } from '@/utils/format';
import { buildDateOptions, parseDate, sameDay, toYmd } from '@/utils/datePickerHelpers';
import { PickerModal } from '@/components/PickerModal';

export function DateField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}): React.JSX.Element {
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [showWebPicker, setShowWebPicker] = React.useState(false);
  const [pickerDraft, setPickerDraft] = React.useState<Date>(parseDate(value));
  const dateOptions = React.useMemo(() => buildDateOptions(21), []);
  const selected = parseDate(value);

  const openPicker = (): void => {
    if (Platform.OS === 'web') {
      setShowWebPicker((prev) => !prev);
      return;
    }
    if (Platform.OS === 'ios') {
      setPickerDraft(selected);
    }
    setShowDatePicker(true);
  };

  const onDatePicked = (event: DateTimePickerEvent, date?: Date): void => {
    if (Platform.OS === 'ios') {
      if (date) {
        setPickerDraft(date);
      }
      return;
    }

    setShowDatePicker(false);
    if (event.type !== 'set' || !date) {
      return;
    }
    onChange(toYmd(date));
  };

  const confirmIosDate = (): void => {
    onChange(toYmd(pickerDraft));
    setShowDatePicker(false);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={openPicker}
        style={styles.trigger}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${value ? formatDate(value) : (placeholder ?? 'Select date')}`}
      >
        <Text style={[styles.triggerText, !value && styles.placeholder]}>
          {value ? formatDate(value) : (placeholder ?? 'Select date')}
        </Text>
        <Text style={styles.chevron}>Pick</Text>
      </Pressable>
      <View style={styles.actions}>
        <Pressable
          onPress={() => onChange('')}
          style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel={`Clear ${label}`}
        >
          <Text style={styles.actionText}>Clear</Text>
        </Pressable>
      </View>

      {Platform.OS === 'web' && showWebPicker ? (
        <View style={styles.panel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {dateOptions.map((date) => {
              const selectedDate = sameDay(date, selected);
              const text = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              return (
                <Pressable
                  key={date.toISOString()}
                  onPress={() => onChange(toYmd(date))}
                  style={[styles.chip, selectedDate && styles.chipSelected]}
                >
                  <Text style={styles.chipText}>{text}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {showDatePicker ? (
        Platform.OS === 'ios' ? (
          <PickerModal visible onCancel={() => setShowDatePicker(false)} onConfirm={confirmIosDate} confirmLabel="Done">
            <DateTimePicker
              value={pickerDraft}
              mode="date"
              display="inline"
              onChange={onDatePicked}
              themeVariant="light"
              accentColor={appColors.primary}
            />
          </PickerModal>
        ) : (
          <DateTimePicker
            value={selected}
            mode="date"
            display={Platform.OS === 'android' ? 'calendar' : 'default'}
            onChange={onDatePicked}
          />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { color: appColors.text, marginBottom: spacing.xs, ...typography.bodyStrong },
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
  triggerText: { color: appColors.text, flexShrink: 1, ...typography.body },
  placeholder: { color: appColors.textMuted },
  chevron: { color: appColors.textMuted, marginLeft: spacing.md },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.xs },
  actionBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  actionText: { color: appColors.primary, ...typography.bodyStrong },
  panel: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: radius.md,
    backgroundColor: appColors.surface,
    padding: spacing.sm
  },
  chip: {
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.xs
  },
  chipSelected: { backgroundColor: appColors.surfaceMuted },
  chipText: { color: appColors.text, ...typography.body }
});
