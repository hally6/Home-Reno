import React from 'react';
import { Alert, Share, Switch, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { Card } from '@/components/Card';
import { FormInput } from '@/components/FormInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { DateField } from '@/components/DateField';
import { Screen } from '@/components/Screen';
import { SelectDropdown } from '@/components/SelectDropdown';
import { appColors } from '@/theme/tokens';
import { useAppContext } from '@/state/AppContext';
import { clearProjectData, getProjectSettings, updateProjectSettings } from '@/data/repositories/projectRepository';
import { exportProjectBackup, restoreProjectBackup, validateBackupFile } from '@/data/backup/backupRepository';
import {
  getNotificationPreferences,
  getScheduledNotificationCount,
  syncScheduledNotifications,
  updateNotificationPreferences
} from '@/services/notificationService';

const leadMinuteOptions = [15, 30, 60, 120, 240];

function validateCurrencyCode(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error('Currency must be a 3-letter ISO code (for example: USD, EUR, GBP).');
  }
  try {
    new Intl.NumberFormat(undefined, { style: 'currency', currency: normalized }).format(1);
  } catch {
    throw new Error(`Unsupported currency code: ${normalized}`);
  }
  return normalized;
}

function parseBackupInput(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('Backup file is empty.');
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const candidate = trimmed.slice(firstBrace, lastBrace + 1);
      return JSON.parse(candidate);
    }
    throw new Error('Backup JSON is malformed.');
  }
}

export function SettingsScreen(): React.JSX.Element {
  const { projectId, refreshData, refreshToken, themePreference, setThemePreference } = useAppContext();

  const [name, setName] = React.useState('');
  const [currency, setCurrency] = React.useState('USD');
  const [address, setAddress] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [targetEndDate, setTargetEndDate] = React.useState('');
  const [homeLayout, setHomeLayout] = React.useState<'standard' | 'tile'>('standard');
  const [themeMode, setThemeMode] = React.useState<'system' | 'light' | 'dark'>('system');
  const [taskDueEnabled, setTaskDueEnabled] = React.useState(true);
  const [eventEnabled, setEventEnabled] = React.useState(true);
  const [waitingEnabled, setWaitingEnabled] = React.useState(false);
  const [leadMinutes, setLeadMinutes] = React.useState('60');
  const [queueCount, setQueueCount] = React.useState(0);
  const [importFileName, setImportFileName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const loadSettings = React.useCallback(() => {
    let active = true;
    setError('');
    setLoading(true);

    Promise.all([
      getProjectSettings(projectId),
      getNotificationPreferences(projectId),
      getScheduledNotificationCount(projectId)
    ])
      .then(([project, prefs, scheduled]) => {
        if (!active || !project) {
          return;
        }
        setName(project.name);
        setCurrency(project.currency || 'USD');
        setAddress(project.address ?? '');
        setStartDate(project.startDate ?? '');
        setTargetEndDate(project.targetEndDate ?? '');
        setHomeLayout(project.homeLayout ?? 'standard');
        setThemeMode(project.themePreference ?? 'system');
        setTaskDueEnabled(prefs.taskDueEnabled);
        setEventEnabled(prefs.eventEnabled);
        setWaitingEnabled(prefs.waitingEnabled);
        setLeadMinutes(String(prefs.leadMinutes));
        setQueueCount(scheduled);
      })
      .catch((e) => {
        if (active) {
          setError(e instanceof Error ? e.message : 'Failed to load settings');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  useFocusEffect(
    React.useCallback(() => {
      void refreshToken;
      return loadSettings();
    }, [loadSettings, refreshToken])
  );

  const onSaveProject = async (): Promise<void> => {
    setError('');
    setLoading(true);
    try {
      const normalizedCurrency = validateCurrencyCode(currency);
      await updateProjectSettings(projectId, {
        name: name.trim(),
        currency: normalizedCurrency,
        address: address.trim() || null,
        startDate: startDate.trim() || null,
        targetEndDate: targetEndDate.trim() || null,
        homeLayout,
        themePreference: themeMode
      });
      setThemePreference(themeMode);
      refreshData();
      Alert.alert('Saved', 'Project settings updated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save project settings');
    } finally {
      setLoading(false);
    }
  };

  const onSaveNotifications = async (): Promise<void> => {
    setError('');
    setLoading(true);
    try {
      await updateNotificationPreferences(projectId, {
        taskDueEnabled,
        eventEnabled,
        waitingEnabled,
        leadMinutes: Number(leadMinutes)
      });
      await syncScheduledNotifications(projectId);
      const count = await getScheduledNotificationCount(projectId);
      setQueueCount(count);
      refreshData();
      Alert.alert('Saved', 'Notification preferences updated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const onExportBackup = async (): Promise<void> => {
    setError('');
    try {
      const backup = await exportProjectBackup(projectId);
      const text = JSON.stringify(backup, null, 2);
      await Share.share({
        message: text
      });
      Alert.alert('Backup exported', 'Backup JSON was shared. It is not encrypted.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to export backup');
    }
  };

  const beginRestore = (parsed: unknown): void => {
    const validation = validateBackupFile(parsed);
    if (!validation.ok) {
      setError(validation.reason);
      Alert.alert('Restore blocked', validation.reason);
      return;
    }

    const payload = validation.backup.payload;
    const summary = `Projects ${payload.projects.length}, Rooms ${payload.rooms.length}, Tasks ${payload.tasks.length}, Events ${payload.events.length}, Expenses ${payload.expenses.length}`;
    Alert.alert('Replace local project data?', `This will replace existing project data.\n\n${summary}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        style: 'destructive',
        onPress: async () => {
          setError('');
          setLoading(true);
          try {
            await restoreProjectBackup(projectId, validation.backup);
            await syncScheduledNotifications(projectId);
            setImportFileName('');
            refreshData();
            Alert.alert('Restore complete', summary);
          } catch (restoreError) {
            setError(restoreError instanceof Error ? restoreError.message : 'Failed to restore backup');
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  const onImportBackupFromFile = async (): Promise<void> => {
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', '*/*'],
        multiple: false,
        copyToCacheDirectory: true
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const picked = result.assets[0];
      if (!picked?.uri) {
        throw new Error('Selected file has no readable URI.');
      }

      const content = await FileSystemLegacy.readAsStringAsync(picked.uri);
      setImportFileName(picked.name ?? 'backup.json');
      const parsed = parseBackupInput(content);
      beginRestore(parsed);
    } catch (e) {
      const reason = e instanceof Error ? e.message : 'Failed to import backup file.';
      setError(reason);
      Alert.alert('Restore blocked', reason);
    }
  };

  const onClearAllData = (): void => {
    Alert.alert(
      'Clear all data?',
      'This will permanently delete all rooms, tasks, events, expenses, attachments, and tags for this project.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Final confirmation', 'This action cannot be undone. Clear all project data now?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Clear all data',
                style: 'destructive',
                onPress: async () => {
                  setError('');
                  setLoading(true);
                  try {
                    await clearProjectData(projectId);
                    setImportFileName('');
                    refreshData();
                    Alert.alert('Data cleared', 'All project records were removed.');
                  } catch (clearError) {
                    setError(clearError instanceof Error ? clearError.message : 'Failed to clear project data');
                  } finally {
                    setLoading(false);
                  }
                }
              }
            ]);
          }
        }
      ]
    );
  };

  return (
    <Screen>
      <Card title="Project Settings" subtitle="Edit project identity and currency defaults." />
      <FormInput label="Project name" value={name} onChangeText={setName} placeholder="My Home Renovation" />
      <FormInput label="Currency (ISO code)" value={currency} onChangeText={setCurrency} placeholder="USD" />
      <Card title="Common currency codes" subtitle="USD, EUR, GBP, CAD, AUD" />
      <FormInput label="Address (optional)" value={address} onChangeText={setAddress} placeholder="123 Main St" />
      <DateField
        label="Start date (optional)"
        value={startDate}
        onChange={setStartDate}
        placeholder="Select start date"
      />
      <DateField
        label="Target end date (optional)"
        value={targetEndDate}
        onChange={setTargetEndDate}
        placeholder="Select target end date"
      />
      <SelectDropdown
        label="Home layout"
        value={homeLayout}
        options={[
          { value: 'standard', label: 'Standard' },
          { value: 'tile', label: 'Tile' }
        ]}
        onChange={(value) => setHomeLayout(value as 'standard' | 'tile')}
      />
      <SelectDropdown
        label="Theme mode"
        value={themeMode}
        options={[
          { value: 'system', label: 'System default' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' }
        ]}
        onChange={(value) => setThemeMode(value as 'system' | 'light' | 'dark')}
      />
      <Card
        title="Theme preview"
        subtitle={
          themeMode === 'system'
            ? `Following system (${themePreference})`
            : `Manual override: ${themeMode.charAt(0).toUpperCase()}${themeMode.slice(1)}`
        }
      />
      <PrimaryButton
        title={loading ? 'Saving...' : 'Save project settings'}
        onPress={onSaveProject}
        disabled={loading || !name.trim()}
      />

      <Card title="Data & Backup" subtitle="Local backup/restore (unencrypted JSON)." />
      <PrimaryButton title="Export Backup JSON" onPress={onExportBackup} disabled={loading} />
      <PrimaryButton title="Restore from file" onPress={onImportBackupFromFile} disabled={loading} />
      {importFileName ? (
        <Text style={{ marginBottom: 8, color: appColors.textMuted }}>Selected file: {importFileName}</Text>
      ) : null}
      <PrimaryButton title="Clear all data" onPress={onClearAllData} disabled={loading} />

      <Card title="Notification Preferences" subtitle={`Scheduled local reminders: ${queueCount}`} />
      <View style={{ marginBottom: 12 }}>
        <Text style={{ marginBottom: 6 }}>Task due reminders</Text>
        <Switch value={taskDueEnabled} onValueChange={setTaskDueEnabled} />
      </View>
      <View style={{ marginBottom: 12 }}>
        <Text style={{ marginBottom: 6 }}>Event reminders</Text>
        <Switch value={eventEnabled} onValueChange={setEventEnabled} />
      </View>
      <View style={{ marginBottom: 12 }}>
        <Text style={{ marginBottom: 6 }}>Waiting follow-up reminders</Text>
        <Switch value={waitingEnabled} onValueChange={setWaitingEnabled} />
      </View>
      <SelectDropdown
        label="Reminder lead time"
        value={leadMinutes}
        options={leadMinuteOptions.map((value) => ({ value: String(value), label: `${value} minutes before` }))}
        onChange={setLeadMinutes}
      />
      <PrimaryButton
        title={loading ? 'Saving...' : 'Save notification preferences'}
        onPress={onSaveNotifications}
        disabled={loading}
      />

      {error ? <Text style={{ color: 'red', marginBottom: 12 }}>{error}</Text> : null}
    </Screen>
  );
}
