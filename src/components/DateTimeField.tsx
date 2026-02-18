import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { appColors, radius, spacing, typography } from '@/theme/tokens';
import { formatDateTime } from '@/utils/format';
import { buildDateOptions, buildTimeOptions, parseDate, sameDay } from '@/utils/datePickerHelpers';
import { PickerModal } from '@/components/PickerModal';

export function DateTimeField({
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
  const [showTimePicker, setShowTimePicker] = React.useState(false);
  const [pendingTimeAfterDate, setPendingTimeAfterDate] = React.useState(false);
  const [pickerDraft, setPickerDraft] = React.useState<Date>(parseDate(value));
  const [showWebPicker, setShowWebPicker] = React.useState(false);
  const [webPanelMode, setWebPanelMode] = React.useState<'date' | 'time' | 'both'>('both');
  const dateOptions = React.useMemo(() => buildDateOptions(21), []);
  const timeOptions = React.useMemo(() => buildTimeOptions(), []);

  const selected = parseDate(value);
  const selectedTimeKey = `${selected.getHours()}:${String(selected.getMinutes() >= 30 ? 30 : 0).padStart(2, '0')}`;

  const openDatePicker = (): void => {
    if (Platform.OS === 'web') {
      setWebPanelMode('date');
      setShowWebPicker(true);
      return;
    }
    if (Platform.OS === 'ios') {
      setPickerDraft(parseDate(value));
      setShowDatePicker(true);
      setShowTimePicker(false);
      setPendingTimeAfterDate(true);
      return;
    }
    setPendingTimeAfterDate(true);
    setShowDatePicker(true);
    setShowTimePicker(false);
  };

  const openTimePicker = (): void => {
    if (Platform.OS === 'web') {
      setWebPanelMode('time');
      setShowWebPicker(true);
      return;
    }
    if (Platform.OS === 'ios') {
      setPickerDraft(parseDate(value));
      setShowTimePicker(true);
      setShowDatePicker(false);
      setPendingTimeAfterDate(false);
      return;
    }
    setPendingTimeAfterDate(false);
    setShowDatePicker(false);
    setShowTimePicker(true);
  };

  const onDatePicked = (event: DateTimePickerEvent, date?: Date): void => {
    if (Platform.OS === 'ios') {
      if (date) {
        setPickerDraft(date);
      }
      return;
    }
    setShowDatePicker(false);
    if (event.type === 'set' && date) {
      const next = new Date(selected);
      next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      onChange(next.toISOString());
      setShowTimePicker(true);
      setPendingTimeAfterDate(false);
      return;
    }
    if (pendingTimeAfterDate) {
      // Some platforms treat tapping an already-selected date as "dismissed".
      // Continue to time picker so the user can still complete the flow.
      setShowTimePicker(true);
    }
    setPendingTimeAfterDate(false);
  };

  const onTimePicked = (event: DateTimePickerEvent, date?: Date): void => {
    if (Platform.OS === 'ios') {
      if (date) {
        setPickerDraft(date);
      }
      return;
    }
    setShowTimePicker(false);
    if (event.type !== 'set' || !date) {
      return;
    }
    const next = new Date(selected);
    next.setHours(date.getHours(), date.getMinutes(), 0, 0);
    onChange(next.toISOString());
  };

  const continueToTime = (): void => {
    const base = parseDate(value);
    const next = new Date(base);
    next.setFullYear(pickerDraft.getFullYear(), pickerDraft.getMonth(), pickerDraft.getDate());
    onChange(next.toISOString());
    setShowDatePicker(false);
    setPickerDraft(next);
    setShowTimePicker(true);
    setPendingTimeAfterDate(false);
  };

  const closeDatePicker = (): void => {
    setShowDatePicker(false);
    setPendingTimeAfterDate(false);
  };

  const confirmTimeSelection = (): void => {
    const base = parseDate(value);
    const next = new Date(base);
    next.setHours(pickerDraft.getHours(), pickerDraft.getMinutes(), 0, 0);
    onChange(next.toISOString());
    setShowTimePicker(false);
  };

  const applyDate = (date: Date): void => {
    const next = new Date(selected);
    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    onChange(next.toISOString());
  };

  const applyTime = (hours: number, minutes: number): void => {
    const next = new Date(selected);
    next.setHours(hours, minutes, 0, 0);
    onChange(next.toISOString());
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={openDatePicker}
        style={styles.trigger}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${value ? formatDateTime(value) : (placeholder ?? 'Select date and time')}`}
      >
        <Text style={[styles.triggerText, !value && styles.placeholder]}>
          {value ? formatDateTime(value) : (placeholder ?? 'Select date and time')}
        </Text>
        <Text style={styles.chevron}>Pick</Text>
      </Pressable>
      <View style={styles.actions}>
        <Pressable
          onPress={openDatePicker}
          style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel={`Pick date for ${label}`}
        >
          <Text style={styles.actionText}>Pick date</Text>
        </Pressable>
        <Pressable
          onPress={openTimePicker}
          style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel={`Pick time for ${label}`}
        >
          <Text style={styles.actionText}>Pick time</Text>
        </Pressable>
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
          {webPanelMode !== 'time' ? (
            <>
              <Text style={styles.sectionTitle}>Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
                {dateOptions.map((date) => {
                  const selectedDate = sameDay(date, selected);
                  const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  return (
                    <Pressable
                      key={date.toISOString()}
                      onPress={() => applyDate(date)}
                      style={[styles.chip, selectedDate && styles.chipSelected]}
                    >
                      <Text style={styles.chipText}>{label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          ) : null}

          {webPanelMode !== 'date' ? (
            <>
              <Text style={styles.sectionTitle}>Time</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
                {timeOptions.map((option) => (
                  <Pressable
                    key={option.key}
                    onPress={() => applyTime(option.hours, option.minutes)}
                    style={[styles.chip, selectedTimeKey === option.key && styles.chipSelected]}
                  >
                    <Text style={styles.chipText}>{option.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}
        </View>
      ) : null}

      {showDatePicker ? (
        Platform.OS === 'ios' ? (
          <PickerModal visible onCancel={closeDatePicker} onConfirm={continueToTime} confirmLabel="Next">
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
      {showTimePicker ? (
        Platform.OS === 'ios' ? (
          <PickerModal
            visible
            onCancel={() => setShowTimePicker(false)}
            onConfirm={confirmTimeSelection}
            confirmLabel="Done"
          >
            <DateTimePicker
              value={pickerDraft}
              mode="time"
              display="spinner"
              onChange={onTimePicked}
              themeVariant="light"
              textColor={appColors.text}
              accentColor={appColors.primary}
            />
          </PickerModal>
        ) : (
          <DateTimePicker
            value={parseDate(value)}
            mode="time"
            display={Platform.OS === 'android' ? 'clock' : 'default'}
            onChange={onTimePicked}
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
  panel: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: radius.md,
    backgroundColor: appColors.surface,
    padding: spacing.sm
  },
  sectionTitle: { color: appColors.text, marginBottom: spacing.xs, ...typography.bodyStrong },
  row: { marginBottom: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.xs
  },
  chipSelected: { backgroundColor: appColors.surfaceMuted },
  chipText: { color: appColors.text, ...typography.body },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.xs },
  actionBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  actionText: { color: appColors.primary, ...typography.bodyStrong }
});
