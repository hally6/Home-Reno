import React from 'react';
import { Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { getTaskDetail, type TaskDetail } from '@/data/repositories/taskRepository';
import { formatDateTime, formatOptionLabel } from '@/utils/format';
import { PrimaryButton } from '@/components/PrimaryButton';
import { LoadError } from '@/components/LoadError';
import type { HomeStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'TaskDetail'>;

export function TaskDetailScreen({ route, navigation }: Props): React.JSX.Element {
  const taskId = route.params.taskId;
  const [task, setTask] = React.useState<TaskDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState('');
  const [retryKey, setRetryKey] = React.useState(0);

  useFocusEffect(
    React.useCallback(() => {
      void retryKey;
      let active = true;
      setIsLoading(true);
      setLoadError('');
      getTaskDetail(taskId)
        .then((result) => {
          if (active) {
            setTask(result);
          }
        })
        .catch((error) => {
          if (active) {
            setTask(null);
            setLoadError(error instanceof Error ? error.message : 'Failed to load task detail');
          }
        })
        .finally(() => {
          if (active) {
            setIsLoading(false);
          }
        });

      return () => {
        active = false;
      };
    }, [retryKey, taskId])
  );

  if (isLoading) {
    return (
      <Screen>
        <Card title="Loading task..." subtitle={`ID: ${taskId}`} />
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen>
        <LoadError title="Task unavailable" message={loadError} onRetry={() => setRetryKey((value) => value + 1)} />
      </Screen>
    );
  }

  if (!task) {
    return (
      <Screen>
        <Card title="Task not found" subtitle={`ID: ${taskId}`} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Card title={task.title} subtitle={`${task.roomName}  ${task.phase}`} />
      <PrimaryButton title="Edit task" onPress={() => navigation.navigate('TaskForm', { taskId })} />
      <Text>Status: {formatOptionLabel(task.status)}</Text>
      <Text>Waiting reason: {task.waitingReason ?? '-'}</Text>
      <Text>Start: {formatDateTime(task.startAt)}</Text>
      <Text>Due: {formatDateTime(task.dueAt)}</Text>
      <Text>Priority: {task.priority}</Text>
      <Text>Trade tags: {task.tradeTags.length ? task.tradeTags.join(', ') : '-'}</Text>
      <Text>Custom tags: {task.customTags.length ? task.customTags.join(', ') : '-'}</Text>
      <Text>Estimate labor: {task.estimateLabor ?? '-'}</Text>
      <Text>Estimate materials: {task.estimateMaterials ?? '-'}</Text>
      <Text>Actual labor: {task.actualLabor ?? '-'}</Text>
      <Text>Actual materials: {task.actualMaterials ?? '-'}</Text>
      <Text>Description: {task.description ?? '-'}</Text>
    </Screen>
  );
}
