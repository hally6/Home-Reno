import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { BadgeChip } from '@/components/BadgeChip';
import { EmptyState } from '@/components/EmptyState';
import { useAppContext } from '@/state/AppContext';
import { deleteRoom, getRoomList, type RoomListItem } from '@/data/repositories/roomRepository';
import { PrimaryButton } from '@/components/PrimaryButton';
import { LoadError } from '@/components/LoadError';
import { formatOptionLabel } from '@/utils/format';
import { getRoomIdentityColor, getRoomInitials } from '@/utils/roomIdentity';
import { ProgressBar } from '@/components/ProgressBar';
import { appColors, spacing, typography } from '@/theme/tokens';
import type { RoomsStackParamList } from '@/navigation/types';
import { useQuery } from '@/hooks/useQuery';

const floorOrder: Record<string, number> = {
  basement: 1,
  ground_floor: 2,
  first_floor: 3,
  second_floor: 4,
  third_floor: 5,
  attic: 6,
  other: 7
};

function normalizeFloor(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');
  if (normalized === 'basment') {
    return 'basement';
  }
  return normalized;
}

function getFloorRank(value: string): number {
  const normalized = normalizeFloor(value);
  return floorOrder[normalized] ?? 99;
}

function floorDisplay(value: string): string {
  if (value.trim().toLowerCase() === 'unassigned') {
    return 'Unassigned';
  }
  return formatOptionLabel(normalizeFloor(value));
}

type Props = NativeStackScreenProps<RoomsStackParamList, 'RoomsList'>;

export function RoomsListScreen({ navigation }: Props): React.JSX.Element {
  const { projectId, refreshData, refreshToken } = useAppContext();
  const {
    data: rooms,
    error: loadError,
    reload
  } = useQuery<RoomListItem[]>({
    query: React.useCallback(() => {
      void refreshToken;
      return getRoomList(projectId);
    }, [projectId, refreshToken]),
    initialData: [],
    errorMessage: 'Failed to load rooms',
    cacheKey: `rooms:${projectId}:${refreshToken}`,
    staleMs: 10000
  });

  const onDeleteRoom = React.useCallback(
    (room: RoomListItem): void => {
      Alert.alert('Delete room?', `Delete "${room.name}" and all related data? This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRoom(projectId, room.id);
              refreshData();
            } catch (error) {
              Alert.alert('Delete failed', error instanceof Error ? error.message : 'Failed to delete room');
            }
          }
        }
      ]);
    },
    [projectId, refreshData]
  );

  const groupedRooms = React.useMemo(() => {
    const grouped = new Map<string, RoomListItem[]>();
    for (const room of rooms) {
      const floor = room.floor || 'Unassigned';
      if (!grouped.has(floor)) {
        grouped.set(floor, []);
      }
      grouped.get(floor)?.push(room);
    }

    return Array.from(grouped.entries()).sort(([floorA], [floorB]) => {
      const rankA = getFloorRank(floorA);
      const rankB = getFloorRank(floorB);
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return floorDisplay(floorA).localeCompare(floorDisplay(floorB));
    });
  }, [rooms]);

  return (
    <Screen>
      {loadError ? <LoadError title="Rooms unavailable" message={loadError} onRetry={reload} /> : null}
      <PrimaryButton title="Add room" onPress={() => navigation.navigate('RoomForm')} />
      {rooms.length === 0 ? (
        <EmptyState
          icon="home-outline"
          title="No rooms yet"
          description="Create your first room to start planning."
        />
      ) : (
        groupedRooms.map(([floor, floorRooms]) => (
          <React.Fragment key={floor}>
            <Card title={floorDisplay(floor)} subtitle={`${floorRooms.length} room(s)`} />
            {floorRooms.map((room) => {
              const progress = room.totalCount > 0 ? Math.round((room.doneCount / room.totalCount) * 100) : 0;
              const nextTask = room.nextTaskTitle ?? 'No pending task';
              const inProgressCount = Math.max(0, room.totalCount - room.doneCount - room.blockedCount);
              const identityColor = getRoomIdentityColor(room.name);
              const initials = getRoomInitials(room.name);

              return (
                <Card
                  key={room.id}
                  title={room.name}
                  subtitle={`${room.totalCount} task(s)`}
                  accentColor={identityColor}
                  headerRight={
                    <View style={[styles.identityAvatar, { backgroundColor: identityColor }]}>
                      <Text style={styles.identityText}>{initials}</Text>
                    </View>
                  }
                  onPress={() => navigation.navigate('RoomDetail', { roomId: room.id })}
                >
                  <View style={styles.chipRow}>
                    <BadgeChip label={`Blocked ${room.blockedCount}`} tone="danger" />
                    <BadgeChip label={`In Progress ${inProgressCount}`} tone="accent" />
                    <BadgeChip label={`Done ${room.doneCount}`} tone="primary" />
                  </View>
                  <View style={styles.progressWrap}>
                    <ProgressBar value={progress} label={`${progress}%`} />
                  </View>
                  <Text style={styles.metaText}>Next: {nextTask}</Text>
                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.iconBtn}
                      onPress={(event) => {
                        event.stopPropagation();
                        navigation.navigate('RoomForm', { roomId: room.id });
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${room.name}`}
                    >
                      <Ionicons name="pencil" size={16} color="#FFFFFF" />
                    </Pressable>
                    <Pressable
                      style={[styles.iconBtn, styles.deleteBtn]}
                      onPress={(event) => {
                        event.stopPropagation();
                        onDeleteRoom(room);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${room.name}`}
                    >
                      <Ionicons name="trash" size={16} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </Card>
              );
            })}
          </React.Fragment>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  identityAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  identityText: {
    ...typography.captionStrong,
    color: appColors.overlayText
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  progressWrap: {
    marginTop: spacing.sm
  },
  metaText: {
    ...typography.caption,
    color: appColors.textMuted,
    marginTop: spacing.sm
  },
  actionRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  iconBtn: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  deleteBtn: {
    marginLeft: 8,
    backgroundColor: appColors.danger
  }
});
