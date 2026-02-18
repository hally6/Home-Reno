import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from '@/navigation/AppNavigator';
import { initDatabase } from '@/data/database';
import { ensureSeedData } from '@/data/bootstrap';
import { getProjectSettings } from '@/data/repositories/projectRepository';
import { syncScheduledNotifications } from '@/services/notificationService';
import { createNavTheme } from '@/theme/navTheme';
import { appColors, applyAppColors } from '@/theme/tokens';
import { AppContextProvider } from '@/state/AppContext';
import { useQueryCacheStore } from '@/state/queryCacheStore';

export default function App(): React.JSX.Element {
  const colorScheme = useColorScheme();
  const [themePreference, setThemePreference] = React.useState<'system' | 'light' | 'dark'>('system');
  const resolvedScheme = themePreference === 'system' ? colorScheme : themePreference;
  React.useMemo(() => applyAppColors(resolvedScheme), [resolvedScheme]);
  const navTheme = React.useMemo(() => createNavTheme(resolvedScheme), [resolvedScheme]);
  const [isReady, setIsReady] = React.useState(false);
  const [bootstrapError, setBootstrapError] = React.useState('');
  const [projectId, setProjectId] = React.useState('');
  const [refreshToken, setRefreshToken] = React.useState(0);
  const [bootstrapKey, setBootstrapKey] = React.useState(0);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async (): Promise<void> => {
      setBootstrapError('');
      await initDatabase();
      const activeProjectId = await ensureSeedData();
      const projectSettings = await getProjectSettings(activeProjectId);
      try {
        await syncScheduledNotifications(activeProjectId);
      } catch (syncError) {
        console.error('Failed to sync notification queue during bootstrap', syncError);
      }

      if (mounted) {
        setThemePreference(projectSettings?.themePreference ?? 'system');
        setProjectId(activeProjectId);
        setIsReady(true);
      }
    };

    bootstrap().catch((error) => {
      if (mounted) {
        setBootstrapError(error instanceof Error ? error.message : 'App bootstrap failed');
        setIsReady(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [bootstrapKey]);

  const refreshData = React.useCallback(() => {
    useQueryCacheStore.getState().clearAll();
    setRefreshToken((value) => value + 1);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {!isReady ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: appColors.bg }}>
            {bootstrapError ? (
              <>
                <Text style={{ marginBottom: 12, color: appColors.danger, fontSize: 16 }}>
                  Startup failed: {bootstrapError}
                </Text>
                <Text style={{ color: appColors.text, marginBottom: 12 }}>
                  Your local data remains on this device. Retry startup.
                </Text>
                <View
                  style={{
                    backgroundColor: appColors.primary,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 8
                  }}
                >
                  <Text style={{ color: '#FFFFFF' }} onPress={() => setBootstrapKey((value) => value + 1)}>
                    Retry startup
                  </Text>
                </View>
              </>
            ) : (
              <>
                <ActivityIndicator color={appColors.primary} />
                <Text style={{ marginTop: 12, color: appColors.text, fontSize: 16 }}>Preparing Home Planner...</Text>
              </>
            )}
          </View>
        ) : (
          <AppContextProvider value={{ projectId, refreshToken, refreshData, themePreference, setThemePreference }}>
            <NavigationContainer theme={navTheme}>
              <AppNavigator />
            </NavigationContainer>
          </AppContextProvider>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
