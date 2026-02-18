import React from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { useAppContext } from '@/state/AppContext';
import { getTodaySections, type TodaySections } from '@/data/repositories/taskRepository';
import { formatDateTime, getDueTrafficLight } from '@/utils/format';
import { LoadError } from '@/components/LoadError';
import { appColors } from '@/theme/tokens';
import type { HomeStackParamList } from '@/navigation/types';
import { useQuery } from '@/hooks/useQuery';

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

type SectionItem = {
  id: string;
  title: string;
  roomName: string;
  status: string;
  dueAt: string | null;
  waitingReason: string | null;
};

const Section = React.memo(function Section({
  title,
  items,
  onPressTask
}: {
  title: string;
  items: SectionItem[];
  onPressTask: (taskId: string) => void;
}): React.JSX.Element {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ marginBottom: 8, fontWeight: '600' }}>{title}</Text>
      {items.length === 0 ? (
        <Card title="No tasks" subtitle="Nothing in this section" />
      ) : (
        items.map((task) => (
          <Card
            key={task.id}
            title={task.title}
            subtitle={`${task.roomName}  ${task.waitingReason ? `Waiting: ${task.waitingReason}` : formatDateTime(task.dueAt)}`}
            rightDotColor={dueColor(task.dueAt, task.status)}
            onPress={() => onPressTask(task.id)}
          />
        ))
      )}
    </View>
  );
});

type Props = NativeStackScreenProps<HomeStackParamList, 'Today'>;

export function TodayScreen({ navigation }: Props): React.JSX.Element {
  const { projectId, refreshToken } = useAppContext();
  const {
    data: sections,
    error: loadError,
    reload
  } = useQuery<TodaySections | null>({
    query: React.useCallback(() => {
      void refreshToken;
      return getTodaySections(projectId);
    }, [projectId, refreshToken]),
    initialData: null,
    errorMessage: 'Failed to load today tasks',
    cacheKey: `today:${projectId}:${refreshToken}`,
    staleMs: 10000
  });

  const onPressTask = React.useCallback(
    (taskId: string) => {
      navigation.navigate('TaskDetail', { taskId });
    },
    [navigation]
  );

  if (!sections) {
    return (
      <Screen>
        {loadError ? <LoadError title="Today unavailable" message={loadError} onRetry={reload} /> : null}
        <Card title="Today" subtitle="Loading tasks..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <Section title="Overdue" items={sections.overdue} onPressTask={onPressTask} />
      <Section title="Due Today" items={sections.dueToday} onPressTask={onPressTask} />
      <Section title="Next" items={sections.next} onPressTask={onPressTask} />
      <Section title="Waiting" items={sections.waiting} onPressTask={onPressTask} />
    </Screen>
  );
}
