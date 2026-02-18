import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { useAppContext } from '@/state/AppContext';
import { getBoardTasks, type TaskListItem } from '@/data/repositories/taskRepository';
import { formatDateTime, getDueTrafficLight } from '@/utils/format';
import { LoadError } from '@/components/LoadError';
import { appColors, radius, spacing, statusColors, typography } from '@/theme/tokens';
import type { HomeStackParamList } from '@/navigation/types';
import { useQuery } from '@/hooks/useQuery';

const columnMeta: Array<{ key: string; title: string }> = [
  { key: 'ideas', title: 'Ideas' },
  { key: 'ready', title: 'Ready' },
  { key: 'in_progress', title: 'In Progress' },
  { key: 'waiting', title: 'Waiting' },
  { key: 'done', title: 'Complete' }
];

function dueColor(dueAt: string | null, status: string): string {
  const traffic = getDueTrafficLight(dueAt, status);
  if (traffic === 'Red') {
    return appColors.danger;
  }
  if (traffic === 'Amber') {
    return appColors.accent;
  }
  return appColors.primary;
}

function columnTint(key: string): string {
  if (key === 'ideas') {
    return statusColors.neutral.bg;
  }
  if (key === 'ready') {
    return statusColors.info.bg;
  }
  if (key === 'in_progress') {
    return statusColors.success.bg;
  }
  if (key === 'waiting') {
    return statusColors.warning.bg;
  }
  return appColors.surfaceMuted;
}

type Props = NativeStackScreenProps<HomeStackParamList, 'Board'>;

const BoardColumn = React.memo(function BoardColumn({
  columnKey,
  title,
  tasks,
  totalTasks,
  onPressTask
}: {
  columnKey: string;
  title: string;
  tasks: TaskListItem[];
  totalTasks: number;
  onPressTask: (taskId: string) => void;
}): React.JSX.Element {
  const columnShare = totalTasks > 0 ? Math.round((tasks.length / totalTasks) * 100) : 0;

  return (
    <View style={styles.column}>
      <View style={[styles.columnHeader, { backgroundColor: columnTint(columnKey) }]}>
        <View style={styles.columnHeaderTop}>
          <Text style={styles.columnTitle}>{title}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{tasks.length}</Text>
          </View>
        </View>
        <ProgressBar value={columnShare} label={`${columnShare}%`} />
      </View>
      {tasks.length === 0 ? (
        <View style={styles.emptyDropZone}>
          <EmptyState icon="clipboard-outline" title="No tasks" description="Drop tasks here or create a new one" />
        </View>
      ) : (
        tasks.map((task) => (
          <Card
            key={task.id}
            title={task.title}
            subtitle={`${task.roomName}  ${task.waitingReason ? `Waiting: ${task.waitingReason}` : formatDateTime(task.dueAt)}`}
            rightDotColor={dueColor(task.dueAt, task.status)}
            size="compact"
            onPress={() => onPressTask(task.id)}
          />
        ))
      )}
    </View>
  );
});

export function BoardScreen({ navigation }: Props): React.JSX.Element {
  const { projectId, refreshToken } = useAppContext();
  const {
    data: columns,
    error: loadError,
    reload
  } = useQuery<Record<string, TaskListItem[]> | null>({
    query: React.useCallback(() => {
      void refreshToken;
      return getBoardTasks(projectId);
    }, [projectId, refreshToken]),
    initialData: null,
    errorMessage: 'Failed to load board',
    cacheKey: `board:${projectId}:${refreshToken}`,
    staleMs: 10000
  });
  const onPressTask = React.useCallback(
    (taskId: string) => {
      navigation.navigate('TaskDetail', { taskId });
    },
    [navigation]
  );
  const boardColumns = React.useMemo(
    () =>
      columnMeta.map((column) => ({
        key: column.key,
        title: column.title,
        tasks: columns?.[column.key] ?? []
      })),
    [columns]
  );
  const totalTasks = React.useMemo(
    () => boardColumns.reduce((sum, column) => sum + column.tasks.length, 0),
    [boardColumns]
  );

  return (
    <Screen>
      {loadError ? <LoadError title="Board unavailable" message={loadError} onRetry={reload} /> : null}
      {!columns ? (
        <Card title="Board" subtitle="Loading board..." />
      ) : (
        <ScrollView
          horizontal
          testID="board-horizontal-scroll"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.boardScrollContent}
        >
          {boardColumns.map((column) => (
            <BoardColumn
              key={column.key}
              columnKey={column.key}
              title={column.title}
              tasks={column.tasks}
              totalTasks={totalTasks}
              onPressTask={onPressTask}
            />
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  boardScrollContent: {
    paddingRight: spacing.sm
  },
  column: {
    width: 280,
    marginRight: spacing.sm,
    marginBottom: spacing.sm
  },
  columnHeader: {
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs
  },
  columnHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs
  },
  columnTitle: {
    ...typography.bodyStrong,
    color: appColors.text
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: appColors.overlayBackground,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs
  },
  countBadgeText: {
    ...typography.captionStrong,
    color: appColors.text
  },
  emptyDropZone: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: appColors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: appColors.surface
  }
});
