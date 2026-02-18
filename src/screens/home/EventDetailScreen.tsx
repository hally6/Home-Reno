import React from 'react';
import { Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { getEventDetail, type EventDetail } from '@/data/repositories/eventRepository';
import { formatDateTime } from '@/utils/format';
import { PrimaryButton } from '@/components/PrimaryButton';
import type { HomeStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'EventDetail'>;

export function EventDetailScreen({ route, navigation }: Props): React.JSX.Element {
  const eventId = route.params.eventId;
  const [event, setEvent] = React.useState<EventDetail | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getEventDetail(eventId)
        .then((result) => {
          if (active) {
            setEvent(result);
          }
        })
        .catch((error) => {
          console.error('Failed to load event detail', error);
        });

      return () => {
        active = false;
      };
    }, [eventId])
  );

  if (!event) {
    return (
      <Screen>
        <Card title="Event not found" subtitle={`ID: ${eventId}`} />
      </Screen>
    );
  }

  const linkedTaskId = event.linkedTaskId;

  return (
    <Screen>
      <Card title={event.title} subtitle={`${event.type}  ${event.roomName ?? 'No room'}`} />
      <PrimaryButton title="Edit event" onPress={() => navigation.navigate('EventForm', { eventId })} />
      <Text>Start: {formatDateTime(event.startsAt)}</Text>
      <Text>End: {formatDateTime(event.endsAt)}</Text>
      <Text>All day: {event.isAllDay ? 'Yes' : 'No'}</Text>
      <Text>Company: {event.company ?? '-'}</Text>
      <Text>Contact: {event.contactName ?? '-'}</Text>
      <Text>Phone: {event.contactPhone ?? '-'}</Text>
      {linkedTaskId ? (
        <Card title="Open linked task" onPress={() => navigation.navigate('TaskDetail', { taskId: linkedTaskId })} />
      ) : null}
    </Screen>
  );
}
