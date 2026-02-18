import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeStackNavigator } from './HomeStack';
import { RoomsStackNavigator } from './RoomsStack';
import { CalendarStackNavigator } from './CalendarStack';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { appColors } from '@/theme/tokens';
import type { RootTabParamList } from './types';
import { NavigationErrorBoundary } from '@/components/NavigationErrorBoundary';

const Tab = createBottomTabNavigator<RootTabParamList>();

function SettingsTabScreen(): React.JSX.Element {
  return (
    <NavigationErrorBoundary scope="Settings">
      <SettingsScreen />
    </NavigationErrorBoundary>
  );
}

export function AppNavigator(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: appColors.primary,
        tabBarInactiveTintColor: appColors.textMuted,
        tabBarStyle: {
          backgroundColor: appColors.surface,
          borderTopColor: appColors.border
        }
      }}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Rooms" component={RoomsStackNavigator} />
      <Tab.Screen name="Calendar" component={CalendarStackNavigator} />
      <Tab.Screen name="Settings" component={SettingsTabScreen} />
    </Tab.Navigator>
  );
}
