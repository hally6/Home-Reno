import React from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { deleteRoom, getRoomDetail, type RoomDetailData } from '@/data/repositories/roomRepository';
import { getProjectById } from '@/data/repositories/projectRepository';
import { deleteAttachment } from '@/data/repositories/attachmentRepository';
import { formatCurrency, formatDateTime, formatOptionLabel, getDueTrafficLight } from '@/utils/format';
import { getRoomIdentityColor, getRoomInitials } from '@/utils/roomIdentity';
import { useAppContext } from '@/state/AppContext';
import { LoadError } from '@/components/LoadError';
import { appColors, typography } from '@/theme/tokens';
import type { RoomsStackParamList } from '@/navigation/types';

const phaseOrder: Array<{ key: string; title: string }> = [
  { key: 'plan', title: 'Plan' },
  { key: 'buy', title: 'Buy' },
  { key: 'prep', title: 'Prep' },
  { key: 'install', title: 'Install' },
  { key: 'finish', title: 'Finish' },
  { key: 'inspect_snag', title: 'Inspect/Snag' }
];

const SWIPE_HINT_FADE_IN_MS = 250;
const SWIPE_HINT_VISIBLE_MS = 1500;
const SWIPE_HINT_FADE_OUT_MS = 350;

function isPhotoAttachment(kind: string, uri: string): boolean {
  if (kind.trim().toLowerCase() === 'photo') {
    return true;
  }
  const normalized = uri.trim().toLowerCase();
  return (
    normalized.endsWith('.jpg') ||
    normalized.endsWith('.jpeg') ||
    normalized.endsWith('.png') ||
    normalized.endsWith('.webp') ||
    normalized.endsWith('.gif')
  );
}

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

type Props = NativeStackScreenProps<RoomsStackParamList, 'RoomDetail'>;

export function RoomDetailScreen({ route, navigation }: Props): React.JSX.Element {
  const roomId = route.params.roomId;
  const { projectId, refreshData } = useAppContext();
  const { width } = useWindowDimensions();
  const attachmentCardWidth = Math.max(240, width - 32);
  const [room, setRoom] = React.useState<RoomDetailData | null>(null);
  const [currency, setCurrency] = React.useState('USD');
  const [loadError, setLoadError] = React.useState('');
  const [retryKey, setRetryKey] = React.useState(0);
  const [attachmentIndex, setAttachmentIndex] = React.useState(0);
  const [fullscreenUri, setFullscreenUri] = React.useState<string | null>(null);
  const [showSwipeHint, setShowSwipeHint] = React.useState(false);
  const attachmentListRef = React.useRef<FlatList<RoomDetailData['attachments'][number]>>(null);
  const swipeHintShownRef = React.useRef(false);
  const swipeHintOpacity = React.useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      void retryKey;
      let active = true;
      getRoomDetail(roomId)
        .then((result) => {
          if (active) {
            setRoom(result);
            setLoadError('');
          }
        })
        .catch((error) => {
          if (active) {
            setLoadError(error instanceof Error ? error.message : 'Failed to load room detail');
          }
        });
      getProjectById(projectId)
        .then((project) => {
          if (active && project?.currency) {
            setCurrency(project.currency);
          }
        })
        .catch((error) => {
          if (active) {
            console.error('Failed to load project currency', error);
          }
        });

      return () => {
        active = false;
      };
    }, [roomId, projectId, retryKey])
  );

  React.useEffect(() => {
    if (!room) {
      return;
    }
    if (attachmentIndex >= room.attachments.length) {
      setAttachmentIndex(0);
    }
  }, [room, attachmentIndex]);

  React.useEffect(() => {
    if (!room || room.attachments.length <= 1 || swipeHintShownRef.current) {
      return;
    }
    swipeHintShownRef.current = true;
    setShowSwipeHint(true);
    swipeHintOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(swipeHintOpacity, { toValue: 1, duration: SWIPE_HINT_FADE_IN_MS, useNativeDriver: true }),
      Animated.delay(SWIPE_HINT_VISIBLE_MS),
      Animated.timing(swipeHintOpacity, { toValue: 0, duration: SWIPE_HINT_FADE_OUT_MS, useNativeDriver: true })
    ]).start(() => setShowSwipeHint(false));
  }, [room, swipeHintOpacity]);

  const dismissSwipeHint = React.useCallback(() => {
    if (!showSwipeHint) {
      return;
    }
    setShowSwipeHint(false);
    swipeHintOpacity.stopAnimation();
    swipeHintOpacity.setValue(0);
  }, [showSwipeHint, swipeHintOpacity]);

  const onDeleteRoom = React.useCallback((): void => {
    if (!room) {
      return;
    }
    const taskCount = Object.values(room.tasksByPhase).reduce((total, tasks) => total + tasks.length, 0);
    Alert.alert(
      'Delete room?',
      `This will permanently remove this room and related records.\n\nTasks: ${taskCount}\nAttachments: ${room.attachments.length}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Final confirmation', `Delete "${room.name}" now? This cannot be undone.`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete room',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await deleteRoom(projectId, room.id);
                    refreshData();
                    navigation.goBack();
                  } catch (deleteError) {
                    Alert.alert(
                      'Delete failed',
                      deleteError instanceof Error ? deleteError.message : 'Failed to delete room'
                    );
                  }
                }
              }
            ]);
          }
        }
      ]
    );
  }, [navigation, projectId, refreshData, room]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable
            style={styles.photoIconBtn}
            onPress={() => navigation.navigate('RoomForm', { roomId })}
            accessibilityRole="button"
            accessibilityLabel="Edit room"
          >
            <Ionicons name="pencil" size={16} color={appColors.overlayText} />
          </Pressable>
          <Pressable
            style={[styles.photoIconBtn, styles.photoDeleteBtn, styles.headerDeleteBtn]}
            onPress={onDeleteRoom}
            accessibilityRole="button"
            accessibilityLabel="Delete room"
          >
            <Ionicons name="trash" size={16} color={appColors.overlayText} />
          </Pressable>
        </View>
      )
    });
  }, [navigation, onDeleteRoom, roomId]);

  if (!room) {
    return (
      <Screen>
        {loadError ? (
          <LoadError title="Room unavailable" message={loadError} onRetry={() => setRetryKey((value) => value + 1)} />
        ) : null}
        <Card title="Room not found" subtitle={`ID: ${roomId}`} />
      </Screen>
    );
  }

  const onAttachmentPress = (attachmentId: string): void => {
    Alert.alert('Attachment', 'Choose an action', [
      { text: 'Edit', onPress: () => navigation.navigate('AttachmentForm', { roomId, attachmentId }) },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => onDeleteAttachment(attachmentId)
      },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const onEditAttachment = (attachmentId: string): void => {
    navigation.navigate('AttachmentForm', { roomId, attachmentId });
  };

  const onDeleteAttachment = (attachmentId: string): void => {
    Alert.alert('Remove attachment?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAttachment(attachmentId, projectId);
            refreshData();
          } catch (e) {
            setLoadError(e instanceof Error ? e.message : 'Failed to remove attachment');
          }
        }
      }
    ]);
  };

  const roomIdentityColor = getRoomIdentityColor(room.name);
  const roomInitials = getRoomInitials(room.name);

  return (
    <Screen>
      <Card
        title={room.name}
        subtitle={`Type: ${room.type}  Floor: ${room.floor ?? 'Unassigned'}`}
        accentColor={roomIdentityColor}
        headerRight={
          <View style={[styles.roomIdentityAvatar, { backgroundColor: roomIdentityColor }]}>
            <Text style={styles.roomIdentityText}>{roomInitials}</Text>
          </View>
        }
      />
      <Card
        title="Room budget"
        subtitle={[
          `Planned: ${formatCurrency(room.budgetPlanned, currency)}`,
          `Actual: ${formatCurrency(room.budgetActual, currency)}`,
          `Variance: ${formatCurrency(room.budgetPlanned - room.budgetActual, currency)}`
        ].join('  ')}
      />
      <PrimaryButton title="Add task" onPress={() => navigation.navigate('TaskForm', { roomId })} />
      <PrimaryButton title="Add expense" onPress={() => navigation.navigate('ExpenseForm', { roomId })} />

      <Text style={{ marginBottom: 8, fontWeight: '600' }}>
        Attachments ({room.attachments.length})
        {room.attachments.length > 0 ? `  ${attachmentIndex + 1}/${room.attachments.length}` : ''}
      </Text>
      {room.attachments.length === 0 ? (
        <Card title="No attachments" subtitle="Add photos, documents, or receipts for this room." />
      ) : (
        <View style={styles.carouselWrap}>
          <FlatList
            ref={attachmentListRef}
            data={room.attachments}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item: attachment }) => (
              <View style={{ width: attachmentCardWidth, paddingRight: 8 }}>
                {isPhotoAttachment(attachment.kind, attachment.uri) ? (
                  <View style={styles.photoWrap}>
                    <Pressable
                      style={styles.photoTouch}
                      onPress={() => onAttachmentPress(attachment.id)}
                      onLongPress={() => setFullscreenUri(attachment.uri)}
                    >
                      <Image source={{ uri: attachment.uri }} style={styles.attachmentPreview} />
                    </Pressable>
                    <View style={styles.photoActions}>
                      <Pressable
                        style={styles.photoIconBtn}
                        onPress={() => onEditAttachment(attachment.id)}
                        accessibilityRole="button"
                        accessibilityLabel="Edit attachment"
                      >
                        <Ionicons name="pencil" size={16} color={appColors.overlayText} />
                      </Pressable>
                      <Pressable
                        style={[styles.photoIconBtn, styles.photoDeleteBtn]}
                        onPress={() => onDeleteAttachment(attachment.id)}
                        accessibilityRole="button"
                        accessibilityLabel="Delete attachment"
                      >
                        <Ionicons name="trash" size={16} color={appColors.overlayText} />
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Card
                    title={attachment.fileName || attachment.kind}
                    subtitle={`${attachment.kind}  ${formatDateTime(attachment.createdAt)}  ${attachment.uri}`}
                    onPress={() => onAttachmentPress(attachment.id)}
                  />
                )}
              </View>
            )}
            onMomentumScrollEnd={(event) => {
              dismissSwipeHint();
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / attachmentCardWidth);
              setAttachmentIndex(Math.max(0, Math.min(room.attachments.length - 1, nextIndex)));
            }}
          />
          {showSwipeHint ? (
            <Animated.View style={[styles.swipeHint, { opacity: swipeHintOpacity }]}>
              <Text style={styles.swipeHintText}>Swipe to view more</Text>
            </Animated.View>
          ) : null}
        </View>
      )}
      {room.attachments.length > 1 ? (
        <View style={styles.dotRow}>
          {room.attachments.map((attachment, idx) => (
            <Pressable
              key={attachment.id}
              style={[styles.dot, idx === attachmentIndex && styles.dotActive]}
              onPress={() => {
                dismissSwipeHint();
                setAttachmentIndex(idx);
                attachmentListRef.current?.scrollToIndex({ index: idx, animated: true });
              }}
            />
          ))}
        </View>
      ) : null}

      {phaseOrder.map((phase) => {
        const tasks = room.tasksByPhase[phase.key] ?? [];
        return (
          <View key={phase.key} style={{ marginBottom: 10 }}>
            <Text style={{ marginBottom: 8, fontWeight: '600' }}>
              {phase.title} ({tasks.length})
            </Text>
            {tasks.length === 0 ? (
              <Card title="No tasks" subtitle="Add tasks for this phase" />
            ) : (
              tasks.map((task) => (
                <Card
                  key={task.id}
                  title={task.title}
                  subtitle={`${formatOptionLabel(task.status)}  ${task.waitingReason ? `Waiting: ${task.waitingReason}` : formatDateTime(task.dueAt)}`}
                  rightDotColor={dueColor(task.dueAt, task.status)}
                  onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
                />
              ))
            )}
          </View>
        );
      })}

      <PrimaryButton title="Add attachment" onPress={() => navigation.navigate('AttachmentForm', { roomId })} />

      <Modal
        visible={Boolean(fullscreenUri)}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenUri(null)}
      >
        <View style={styles.fullscreenBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFullscreenUri(null)} />
          <Pressable
            style={styles.fullscreenCloseButton}
            onPress={() => setFullscreenUri(null)}
            accessibilityRole="button"
            accessibilityLabel="Close fullscreen image"
          >
            <Ionicons name="close" size={18} color={appColors.overlayText} />
          </Pressable>
          {fullscreenUri ? (
            <Image source={{ uri: fullscreenUri }} style={styles.fullscreenImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  carouselWrap: {
    position: 'relative'
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerDeleteBtn: {
    marginLeft: 8
  },
  photoWrap: {
    marginBottom: 12,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: appColors.border
  },
  photoTouch: {
    width: '100%'
  },
  attachmentPreview: {
    width: '100%',
    height: 180,
    borderRadius: 10
  },
  photoActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8
  },
  photoIconBtn: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  photoDeleteBtn: {
    backgroundColor: 'rgba(156,47,47,0.85)'
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: appColors.border
  },
  dotActive: {
    width: 18,
    borderRadius: 4,
    backgroundColor: appColors.primary
  },
  swipeHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: 'center'
  },
  swipeHintText: {
    color: appColors.overlayText,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '600'
  },
  fullscreenBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  fullscreenImage: {
    width: '100%',
    height: '100%'
  },
  fullscreenCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  roomIdentityAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  roomIdentityText: {
    ...typography.captionStrong,
    color: appColors.overlayText
  }
});
