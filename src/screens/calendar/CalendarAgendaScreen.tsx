import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { useAppContext } from '@/state/AppContext';
import { getAgendaRange, type AgendaItem } from '@/data/repositories/eventRepository';
import { formatDate, formatDateTime, formatOptionLabel, getDueTrafficLight } from '@/utils/format';
import { PrimaryButton } from '@/components/PrimaryButton';
import { LoadError } from '@/components/LoadError';
import { appColors, radius, spacing } from '@/theme/tokens';
import type { CalendarStackParamList } from '@/navigation/types';
import { useQuery } from '@/hooks/useQuery';

function agendaSubtitle(item: AgendaItem): string {
  const base = `${item.roomName ?? 'No room'}  ${formatDateTime(item.startsAt)}`;
  if (item.itemType === 'event') {
    return `${item.subtype}${item.isAllDay ? ' (all day)' : ''}  ${base}`;
  }
  return `task (${formatOptionLabel(item.subtype)})  ${base}`;
}

function agendaDotColor(item: AgendaItem): string | undefined {
  if (item.itemType !== 'task') {
    return undefined;
  }

  const traffic = getDueTrafficLight(item.startsAt, item.subtype);
  if (traffic === 'Red') {
    return appColors.danger;
  }
  if (traffic === 'Amber') {
    return appColors.accent;
  }
  return appColors.primary;
}

type Props = NativeStackScreenProps<CalendarStackParamList, 'Agenda'>;

export function CalendarAgendaScreen({ navigation }: Props): React.JSX.Element {
  const { projectId, refreshToken } = useAppContext();
  const [viewMode, setViewMode] = React.useState<'calendar' | 'agenda'>('calendar');
  const [monthBase, setMonthBase] = React.useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = React.useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const monthStart = React.useMemo(() => new Date(monthBase.getFullYear(), monthBase.getMonth(), 1), [monthBase]);
  const monthEnd = React.useMemo(
    () => new Date(monthBase.getFullYear(), monthBase.getMonth() + 1, 0, 23, 59, 59, 999),
    [monthBase]
  );
  const monthLabel = React.useMemo(
    () => monthStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    [monthStart]
  );
  const todayKey = new Date().toISOString().slice(0, 10);
  const weekLabels = React.useMemo(() => {
    const formatter = new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' });
    const baseSunday = new Date(Date.UTC(2026, 0, 4));
    return Array.from({ length: 7 }, (_, idx) => {
      const day = new Date(baseSunday);
      day.setUTCDate(baseSunday.getUTCDate() + idx);
      return formatter.format(day);
    });
  }, []);
  const {
    data: items,
    error: loadError,
    reload
  } = useQuery<AgendaItem[]>({
    query: React.useCallback(() => {
      void refreshToken;
      return getAgendaRange(projectId, monthStart.toISOString(), monthEnd.toISOString());
    }, [monthEnd, monthStart, projectId, refreshToken]),
    initialData: [],
    errorMessage: 'Failed to load agenda',
    cacheKey: `agenda:${projectId}:${monthStart.toISOString()}:${monthEnd.toISOString()}:${refreshToken}`,
    staleMs: 10000
  });

  const dayCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const dateKey = item.startsAt.slice(0, 10);
      counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const selectedItems = React.useMemo(
    () => items.filter((item) => item.startsAt.slice(0, 10) === selectedDate),
    [items, selectedDate]
  );

  const calendarCells = React.useMemo(() => {
    const cells: Array<{ key: string; date: Date | null; label: string }> = [];
    const firstWeekday = monthStart.getDay();
    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push({ key: `pad-${i}`, date: null, label: '' });
    }
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      cells.push({ key: date.toISOString(), date, label: String(day) });
    }
    return cells;
  }, [monthStart]);

  const onPressAgendaItem = React.useCallback(
    (item: AgendaItem): void => {
      if (item.itemType === 'event') {
        navigation.navigate('EventDetail', { eventId: item.id });
        return;
      }
      navigation.navigate('TaskDetail', { taskId: item.id });
    },
    [navigation]
  );

  const onPrevMonth = (): void => {
    setMonthBase((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const onNextMonth = (): void => {
    setMonthBase((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <Screen>
      {loadError ? <LoadError title="Agenda unavailable" message={loadError} onRetry={reload} /> : null}
      <PrimaryButton title="Add event" onPress={() => navigation.navigate('EventForm')} />
      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => setViewMode('calendar')}
          style={[styles.toggle, viewMode === 'calendar' && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, viewMode === 'calendar' && styles.toggleTextActive]}>Calendar</Text>
        </Pressable>
        <Pressable
          onPress={() => setViewMode('agenda')}
          style={[styles.toggle, viewMode === 'agenda' && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, viewMode === 'agenda' && styles.toggleTextActive]}>Agenda</Text>
        </Pressable>
      </View>

      {viewMode === 'calendar' ? (
        <>
          <View style={styles.monthHeader}>
            <Pressable onPress={onPrevMonth} style={styles.monthNav}>
              <Text style={styles.monthNavText}>Prev</Text>
            </Pressable>
            <Text style={styles.monthTitle}>{monthLabel}</Text>
            <Pressable onPress={onNextMonth} style={styles.monthNav}>
              <Text style={styles.monthNavText}>Next</Text>
            </Pressable>
          </View>
          <View style={styles.weekHeader}>
            {weekLabels.map((label) => (
              <Text key={label} style={styles.weekLabel}>
                {label}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {calendarCells.map((cell) => {
              if (!cell.date) {
                return <View key={cell.key} style={[styles.cell, styles.cellEmpty]} />;
              }
              const ymd = cell.date.toISOString().slice(0, 10);
              const isSelected = ymd === selectedDate;
              const count = dayCounts.get(ymd) ?? 0;
              const isToday = ymd === todayKey;
              return (
                <Pressable
                  key={cell.key}
                  onPress={() => setSelectedDate(ymd)}
                  style={[styles.cell, isSelected && styles.cellSelected, isToday && styles.cellToday]}
                >
                  <Text style={styles.cellLabel}>{cell.label}</Text>
                  {count > 0 ? <Text style={styles.cellCount}>{count}</Text> : null}
                </Pressable>
              );
            })}
          </View>
          <Card title="Selected day" subtitle={`${formatDate(selectedDate)}  ${selectedItems.length} item(s)`} />
          {selectedItems.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="No events scheduled"
              description="No tasks or events scheduled for this day."
            />
          ) : (
            selectedItems.map((item) => (
              <Card
                key={`${item.itemType}:${item.id}`}
                title={item.title}
                subtitle={agendaSubtitle(item)}
                rightDotColor={agendaDotColor(item)}
                onPress={() => onPressAgendaItem(item)}
              />
            ))
          )}
        </>
      ) : (
        <>
          <View style={{ marginBottom: 8 }}>
            <Text>Agenda</Text>
          </View>
          {items.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="No events scheduled"
              description="Tasks appear only when dated."
            />
          ) : (
            items.map((item) => (
              <Card
                key={`${item.itemType}:${item.id}`}
                title={item.title}
                subtitle={agendaSubtitle(item)}
                rightDotColor={agendaDotColor(item)}
                onPress={() => onPressAgendaItem(item)}
              />
            ))
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  toggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surface
  },
  toggleActive: {
    backgroundColor: appColors.primary,
    borderColor: appColors.primary
  },
  toggleText: { color: appColors.text },
  toggleTextActive: { color: appColors.overlayText },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  monthTitle: { fontWeight: '600', color: appColors.text },
  monthNav: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  monthNavText: { color: appColors.primary, fontWeight: '600' },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  weekLabel: { flex: 1, textAlign: 'center', color: appColors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  cell: {
    width: '14.285%',
    borderWidth: 1,
    borderColor: appColors.border,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cellEmpty: { backgroundColor: appColors.surfaceMuted },
  cellSelected: { backgroundColor: appColors.surfaceMuted },
  cellToday: { borderColor: appColors.primary },
  cellLabel: { color: appColors.text },
  cellCount: { marginTop: 2, fontSize: 12, color: appColors.primary }
});
