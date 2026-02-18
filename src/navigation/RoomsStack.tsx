import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RoomsListScreen } from '@/screens/rooms/RoomsListScreen';
import { RoomDetailScreen } from '@/screens/rooms/RoomDetailScreen';
import { RoomFormScreen } from '@/screens/forms/RoomFormScreen';
import { TaskDetailScreen } from '@/screens/home/TaskDetailScreen';
import { TaskFormScreen } from '@/screens/forms/TaskFormScreen';
import { ExpenseDetailScreen } from '@/screens/home/ExpenseDetailScreen';
import { ExpenseFormScreen } from '@/screens/forms/ExpenseFormScreen';
import { AttachmentFormScreen } from '@/screens/forms/AttachmentFormScreen';
import type { RoomsStackParamList } from './types';
import { appColors } from '@/theme/tokens';
import { NavigationErrorBoundary } from '@/components/NavigationErrorBoundary';

const Stack = createNativeStackNavigator<RoomsStackParamList>();

export function RoomsStackNavigator(): React.JSX.Element {
  return (
    <NavigationErrorBoundary scope="Rooms">
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: appColors.surface },
          headerTintColor: appColors.text,
          contentStyle: { backgroundColor: appColors.bg }
        }}
      >
        <Stack.Screen name="RoomsList" component={RoomsListScreen} options={{ title: 'Rooms' }} />
        <Stack.Screen name="RoomDetail" component={RoomDetailScreen} options={{ title: 'Room Detail' }} />
        <Stack.Screen name="RoomForm" component={RoomFormScreen} options={{ title: 'Room' }} />
        <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Task Detail' }} />
        <Stack.Screen name="TaskForm" component={TaskFormScreen} options={{ title: 'Task' }} />
        <Stack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} options={{ title: 'Expense Detail' }} />
        <Stack.Screen name="ExpenseForm" component={ExpenseFormScreen} options={{ title: 'Expense' }} />
        <Stack.Screen name="AttachmentForm" component={AttachmentFormScreen} options={{ title: 'Attachment' }} />
      </Stack.Navigator>
    </NavigationErrorBoundary>
  );
}
