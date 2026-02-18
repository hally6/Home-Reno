import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeDashboardScreen } from '@/screens/home/HomeDashboardScreen';
import { TodayScreen } from '@/screens/home/TodayScreen';
import { BoardScreen } from '@/screens/home/BoardScreen';
import { BudgetScreen } from '@/screens/home/BudgetScreen';
import { TaskDetailScreen } from '@/screens/home/TaskDetailScreen';
import { EventDetailScreen } from '@/screens/home/EventDetailScreen';
import { ExpenseDetailScreen } from '@/screens/home/ExpenseDetailScreen';
import { SearchFiltersScreen } from '@/screens/home/SearchFiltersScreen';
import { QuotesScreen } from '@/screens/home/QuotesScreen';
import { TaskFormScreen } from '@/screens/forms/TaskFormScreen';
import { EventFormScreen } from '@/screens/forms/EventFormScreen';
import { ExpenseFormScreen } from '@/screens/forms/ExpenseFormScreen';
import { QuoteFormScreen } from '@/screens/forms/QuoteFormScreen';
import type { HomeStackParamList } from './types';
import { appColors } from '@/theme/tokens';
import { NavigationErrorBoundary } from '@/components/NavigationErrorBoundary';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStackNavigator(): React.JSX.Element {
  return (
    <NavigationErrorBoundary scope="Home">
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: appColors.surface },
          headerTintColor: appColors.text,
          contentStyle: { backgroundColor: appColors.bg },
          animation: 'slide_from_right'
        }}
      >
        <Stack.Screen name="HomeDashboard" component={HomeDashboardScreen} options={{ title: 'Home' }} />
        <Stack.Screen name="Today" component={TodayScreen} />
        <Stack.Screen name="Board" component={BoardScreen} />
        <Stack.Screen name="Budget" component={BudgetScreen} />
        <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Task Detail' }} />
        <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: 'Event Detail' }} />
        <Stack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} options={{ title: 'Expense Detail' }} />
        <Stack.Screen name="TaskForm" component={TaskFormScreen} options={{ title: 'Task' }} />
        <Stack.Screen name="EventForm" component={EventFormScreen} options={{ title: 'Event' }} />
        <Stack.Screen name="ExpenseForm" component={ExpenseFormScreen} options={{ title: 'Expense' }} />
        <Stack.Screen name="SearchFilters" component={SearchFiltersScreen} options={{ title: 'Search & Filters' }} />
        <Stack.Screen name="Quotes" component={QuotesScreen} options={{ title: 'Builder Quotes' }} />
        <Stack.Screen name="QuoteForm" component={QuoteFormScreen} options={{ title: 'Quote' }} />
      </Stack.Navigator>
    </NavigationErrorBoundary>
  );
}
