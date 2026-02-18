import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CalendarAgendaScreen } from '@/screens/calendar/CalendarAgendaScreen';
import { EventDetailScreen } from '@/screens/home/EventDetailScreen';
import { EventFormScreen } from '@/screens/forms/EventFormScreen';
import { TaskDetailScreen } from '@/screens/home/TaskDetailScreen';
import { TaskFormScreen } from '@/screens/forms/TaskFormScreen';
import type { CalendarStackParamList } from './types';
import { appColors } from '@/theme/tokens';
import { NavigationErrorBoundary } from '@/components/NavigationErrorBoundary';

const Stack = createNativeStackNavigator<CalendarStackParamList>();

export function CalendarStackNavigator(): React.JSX.Element {
  return (
    <NavigationErrorBoundary scope="Calendar">
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: appColors.surface },
          headerTintColor: appColors.text,
          contentStyle: { backgroundColor: appColors.bg }
        }}
      >
        <Stack.Screen name="Agenda" component={CalendarAgendaScreen} options={{ title: 'Calendar' }} />
        <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: 'Event Detail' }} />
        <Stack.Screen name="EventForm" component={EventFormScreen} options={{ title: 'Event' }} />
        <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Task Detail' }} />
        <Stack.Screen name="TaskForm" component={TaskFormScreen} options={{ title: 'Task' }} />
      </Stack.Navigator>
    </NavigationErrorBoundary>
  );
}
