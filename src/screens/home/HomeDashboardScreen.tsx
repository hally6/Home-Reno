import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { BadgeChip } from '@/components/BadgeChip';
import { Typography } from '@/components/Typography';
import { useAppContext } from '@/state/AppContext';
import { getDashboardSnapshot, type DashboardSnapshot } from '@/data/repositories/dashboardRepository';
import { formatCurrency, formatDateTime, formatOptionLabel } from '@/utils/format';
import { LoadError } from '@/components/LoadError';
import { appColors, radius, spacing } from '@/theme/tokens';
import type { HomeStackParamList, RootTabParamList } from '@/navigation/types';
import { useQuery } from '@/hooks/useQuery';
import { useReducedMotion } from '@/hooks/useReducedMotion';

function riskDotColor(risk: 'low' | 'medium' | 'high'): string {
  if (risk === 'high') {
    return appColors.danger;
  }
  if (risk === 'medium') {
    return appColors.accent;
  }
  return appColors.primary;
}

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeDashboard'>;

export function HomeDashboardScreen({ navigation }: Props): React.JSX.Element {
  const { projectId, refreshToken } = useAppContext();

  const navigateToTab = React.useCallback((tab: keyof RootTabParamList) => {
    navigation.navigate(tab as never);
  }, [navigation]);
  const {
    data: snapshot,
    error: loadError,
    reload
  } = useQuery<DashboardSnapshot | null>({
    query: React.useCallback(() => {
      void refreshToken;
      return getDashboardSnapshot(projectId);
    }, [projectId, refreshToken]),
    initialData: null,
    errorMessage: 'Failed to load dashboard',
    cacheKey: `dashboard:${projectId}:${refreshToken}`,
    staleMs: 10000
  });

  const hasTasks = Number(snapshot?.totalTaskCount ?? 0) > 0;
  const hasEvents = snapshot ? snapshot.upcomingSummary !== 'No upcoming events' : false;
  const hasSpend = Number(snapshot?.budgetActual ?? 0) > 0;
  const budgetProgress =
    snapshot && snapshot.budgetPlanned > 0 ? Math.round((snapshot.budgetActual / snapshot.budgetPlanned) * 100) : 0;
  const overallProgress = snapshot?.overallProgress ?? 0;
  const boundedOverallProgress = Math.max(0, Math.min(100, overallProgress));
  const reduceMotion = useReducedMotion();
  const tileAnimValues = React.useRef(Array.from({ length: 7 }, () => new Animated.Value(0))).current;
  const didAnimateTiles = React.useRef(false);

  React.useEffect(() => {
    if (snapshot?.homeLayout !== 'tile') {
      return;
    }
    if (process.env.NODE_ENV === 'test' || reduceMotion) {
      tileAnimValues.forEach((value) => value.setValue(1));
      return;
    }
    if (didAnimateTiles.current) {
      tileAnimValues.forEach((value) => value.setValue(1));
      return;
    }
    didAnimateTiles.current = true;
    Animated.stagger(
      50,
      tileAnimValues.map((value) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true
        })
      )
    ).start();
  }, [reduceMotion, snapshot?.homeLayout, tileAnimValues]);

  const tileAnimatedStyle = React.useCallback(
    (index: number) => ({
      opacity: tileAnimValues[index],
      transform: [
        {
          translateY: tileAnimValues[index].interpolate({
            inputRange: [0, 1],
            outputRange: [8, 0]
          })
        }
      ]
    }),
    [tileAnimValues]
  );

  return (
    <Screen>
      {loadError ? <LoadError title="Dashboard unavailable" message={loadError} onRetry={reload} /> : null}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Typography variant="titleLg" style={styles.headerTitle}>
            {snapshot?.projectName ?? 'Home Planner'}
          </Typography>
          <Typography variant="body" style={styles.headerSubtitle} color={appColors.textMuted}>
            Action hub
          </Typography>
        </View>
        <View style={styles.localBadge}>
          <Typography variant="captionStrong" style={styles.localBadgeText} color={appColors.textMuted}>
            Local mode
          </Typography>
        </View>
      </View>
      <View style={styles.searchActions}>
        <Pressable
          style={styles.searchBtn}
          onPress={() => navigation.navigate('SearchFilters')}
          accessibilityRole="button"
          accessibilityLabel="Open search and filters"
        >
          <Text style={styles.searchBtnText}>Search & Filters</Text>
        </Pressable>
      </View>
      <View style={styles.projectProgressWrap}>
        <View style={styles.projectProgressHeader}>
          <Typography variant="captionStrong" color={appColors.textMuted}>
            Project progress
          </Typography>
          <Typography variant="captionStrong" color={appColors.textMuted}>
            {boundedOverallProgress}%
          </Typography>
        </View>
        <ProgressBar value={boundedOverallProgress} />
      </View>

      {snapshot?.homeLayout === 'tile' ? (
        <>
          <View style={styles.tileGrid}>
            <Animated.View style={[styles.tileMotionWrap, styles.tileMotionWrapWide, tileAnimatedStyle(0)]}>
              <Pressable
                style={[styles.tile, styles.tileDanger, styles.tileWide]}
                onPress={() => navigation.navigate('Today')}
              >
                <Ionicons name="alert-circle" size={20} color={appColors.overlayText} style={styles.tileIcon} />
                <Text style={styles.tileLabel}>Overdue</Text>
                <Text style={styles.tileValue}>{snapshot.todayCounts.overdue}</Text>
              </Pressable>
            </Animated.View>
            <Animated.View style={[styles.tileMotionWrap, tileAnimatedStyle(1)]}>
              <Pressable style={[styles.tile, styles.tileNeutral]} onPress={() => navigation.navigate('Today')}>
                <Ionicons name="checkmark-circle" size={20} color={appColors.overlayText} style={styles.tileIcon} />
                <Text style={styles.tileLabel}>Due</Text>
                <Text style={styles.tileValue}>{snapshot.todayCounts.dueToday}</Text>
              </Pressable>
            </Animated.View>
            <Animated.View style={[styles.tileMotionWrap, tileAnimatedStyle(2)]}>
              <Pressable style={[styles.tile, styles.tileAccent]} onPress={() => navigation.navigate('Today')}>
                <Ionicons name="time" size={20} color={appColors.overlayText} style={styles.tileIcon} />
                <Text style={styles.tileLabel}>Waiting</Text>
                <Text style={styles.tileValue}>{snapshot.todayCounts.waiting}</Text>
              </Pressable>
            </Animated.View>
            <Animated.View style={[styles.tileMotionWrap, tileAnimatedStyle(3)]}>
              <Pressable style={[styles.tile, styles.tilePrimary]} onPress={() => navigation.navigate('Today')}>
                <Ionicons
                  name="arrow-forward-circle"
                  size={20}
                  color={appColors.overlayText}
                  style={styles.tileIcon}
                />
                <Text style={styles.tileLabel}>Next</Text>
                <Text style={styles.tileValue}>{snapshot.todayCounts.next}</Text>
              </Pressable>
            </Animated.View>
            <Animated.View style={[styles.tileMotionWrap, tileAnimatedStyle(4)]}>
              <Pressable style={[styles.tile, styles.tileRoom]} onPress={() => navigateToTab('Rooms')}>
                <Ionicons name="home" size={20} color={appColors.overlayText} style={styles.tileIcon} />
                <Text style={styles.tileLabel}>Rooms</Text>
                <Text style={styles.tileSub}>{snapshot.roomsSummary}</Text>
              </Pressable>
            </Animated.View>
            <Animated.View style={[styles.tileMotionWrap, tileAnimatedStyle(5)]}>
              <Pressable style={[styles.tile, styles.tileBudget]} onPress={() => navigation.navigate('Budget')}>
                <Ionicons name="wallet" size={20} color={appColors.overlayText} style={styles.tileIcon} />
                <Text style={styles.tileLabel}>Budget</Text>
                <Text style={styles.tileSub}>
                  {hasSpend
                    ? `${formatCurrency(snapshot.budgetActual, snapshot.currency)} / ${formatCurrency(snapshot.budgetPlanned, snapshot.currency)}`
                    : 'No spend yet'}
                </Text>
              </Pressable>
            </Animated.View>
            <Animated.View style={[styles.tileMotionWrap, tileAnimatedStyle(6)]}>
              <Pressable style={[styles.tile, styles.tileEvents]} onPress={() => navigateToTab('Calendar')}>
                <Ionicons name="calendar" size={20} color={appColors.overlayText} style={styles.tileIcon} />
                <Text style={styles.tileLabel}>Upcoming</Text>
                <Text style={styles.tileSub}>{snapshot.upcomingSummary}</Text>
              </Pressable>
            </Animated.View>
          </View>
          {snapshot.topRecommendedTasks?.length ? (
            <>
              <Card title="Next Up" subtitle={`${snapshot.topRecommendedTasks.length} recommendation(s)`} />
              {snapshot.topRecommendedTasks.map((task) => (
                <Card
                  key={task.id}
                  title={`${task.title} (${task.roomName})`}
                  subtitle={`${formatOptionLabel(task.status)}  ${formatDateTime(task.dueAt)}  ${task.reasons[0] ?? ''}`}
                  onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
                />
              ))}
            </>
          ) : null}
        </>
      ) : null}

      {snapshot?.homeLayout !== 'tile' ? (
        <>
          {snapshot ? (
            <Card
              title="Today"
              subtitle="What needs attention now"
              accentColor={appColors.primary}
              headerRight={
                <View style={styles.focusBadge}>
                  <Typography variant="captionStrong" style={styles.focusBadgeText}>
                    Focus
                  </Typography>
                </View>
              }
              onPress={() => navigation.navigate('Today')}
            >
              <View style={styles.chipRow}>
                <BadgeChip label={`Overdue ${snapshot.todayCounts.overdue}`} tone="danger" />
                <BadgeChip label={`Due ${snapshot.todayCounts.dueToday}`} tone="neutral" />
                <BadgeChip label={`Waiting ${snapshot.todayCounts.waiting}`} tone="accent" />
                <BadgeChip label={`Next ${snapshot.todayCounts.next}`} tone="primary" />
              </View>
              <View style={styles.todayActions}>
                <PrimaryButton title="Open Today" onPress={() => navigation.navigate('Today')} />
                <SecondaryButton
                  title="Add task"
                  onPress={() => navigation.navigate('TaskForm')}
                  accessibilityLabel="Add a task"
                />
              </View>
            </Card>
          ) : (
            <Card title="Today" subtitle="Loading your priorities..." />
          )}

          {!snapshot ? <Card title="Next Up" subtitle="Loading recommendations..." /> : null}
          {snapshot && !hasTasks ? (
            <Card title="Next Up" subtitle="No tasks yet. Create your first task to get recommendations.">
              <PrimaryButton title="Create first task" onPress={() => navigation.navigate('TaskForm')} />
              <SecondaryButton title="Open Rooms" onPress={() => navigateToTab('Rooms')} />
            </Card>
          ) : null}
          {snapshot?.topRecommendedTasks?.length ? (
            <>
              <Card title="Next Up" subtitle={`${snapshot.topRecommendedTasks.length} recommendation(s)`} />
              {snapshot.topRecommendedTasks.map((task) => (
                <Card
                  key={task.id}
                  title={`${task.title} (${task.roomName})`}
                  subtitle={`${formatOptionLabel(task.status)}  ${formatDateTime(task.dueAt)}  ${task.reasons[0] ?? ''}`}
                  onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
                />
              ))}
              <Pressable
                style={styles.inlineAction}
                onPress={() => navigation.navigate('Today')}
                accessibilityRole="button"
                accessibilityLabel="See all recommendations"
              >
                <Text style={styles.inlineActionText}>See all recommendations</Text>
              </Pressable>
            </>
          ) : null}

          <Card
            title="Rooms"
            subtitle={snapshot?.roomsSummary ?? 'Loading...'}
            onPress={() => navigateToTab('Rooms')}
          />
          <Card
            title="Budget"
            subtitle={
              snapshot
                ? hasSpend
                  ? `${formatCurrency(snapshot.budgetActual, snapshot.currency)} spent of ${formatCurrency(snapshot.budgetPlanned, snapshot.currency)} planned`
                : 'No spend yet'
                : 'Loading...'
            }
            headerRight={
              snapshot ? (
                <View style={styles.riskBadgeRow}>
                  <Text style={styles.riskBadgeText}>Risk</Text>
                  <View style={[styles.riskBadgeDot, { backgroundColor: riskDotColor(snapshot.costRisk) }]} />
                </View>
              ) : undefined
            }
            onPress={() => navigation.navigate('Budget')}
          >
            {snapshot ? (
              <>
                {snapshot.budgetPlanned > 0 ? (
                  <View style={styles.budgetProgressWrap}>
                    <ProgressBar value={budgetProgress} label={`${Math.max(0, Math.min(100, budgetProgress))}%`} />
                  </View>
                ) : null}
              </>
            ) : null}
          </Card>
          <Card
            title="Upcoming"
            subtitle={snapshot?.upcomingSummary ?? 'Loading...'}
            onPress={() => navigateToTab('Calendar')}
          />
          {snapshot && !hasEvents ? (
            <Pressable
              style={styles.inlineAction}
              onPress={() => navigation.navigate('EventForm')}
              accessibilityRole="button"
              accessibilityLabel="Add event"
            >
              <Text style={styles.inlineActionText}>Add event</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  headerTitle: {
    color: appColors.text,
    fontSize: 20,
    fontWeight: '700'
  },
  headerSubtitle: {
    color: appColors.textMuted,
    marginTop: 2
  },
  localBadge: {
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  localBadgeText: {
    color: appColors.textMuted,
    fontSize: 12,
    fontWeight: '600'
  },
  searchActions: {
    flexDirection: 'row'
  },
  projectProgressWrap: {
    marginBottom: spacing.md
  },
  projectProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs
  },
  searchBtn: {
    flex: 1,
    marginBottom: spacing.md
  },
  searchBtnText: {
    color: appColors.primary,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    textAlign: 'center'
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  todayActions: {
    marginTop: spacing.md
  },
  inlineAction: {
    marginTop: -spacing.xs,
    marginBottom: spacing.md
  },
  inlineActionText: {
    color: appColors.primary,
    fontWeight: '700'
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  tileMotionWrap: {
    width: '48%'
  },
  tileMotionWrapWide: {
    width: '100%'
  },
  tile: {
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 88,
    width: '100%',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FFFFFF40'
  },
  tileIcon: {
    marginBottom: spacing.xs
  },
  tileWide: {
    width: '100%'
  },
  tileDanger: {
    backgroundColor: '#9C2F2F'
  },
  tileAccent: {
    backgroundColor: '#C97A2B'
  },
  tilePrimary: {
    backgroundColor: '#0E6B56'
  },
  tileNeutral: {
    backgroundColor: '#3E4B57'
  },
  tileRoom: {
    backgroundColor: '#1E4D78'
  },
  tileBudget: {
    backgroundColor: '#2C5B39'
  },
  tileEvents: {
    backgroundColor: '#5C3E79'
  },
  tileLabel: {
    color: appColors.overlayText,
    fontWeight: '700'
  },
  tileValue: {
    color: appColors.overlayText,
    fontSize: 32,
    fontWeight: '800'
  },
  tileSub: {
    color: appColors.overlayText,
    fontSize: 12
  },
  budgetProgressWrap: {
    marginTop: spacing.sm
  },
  focusBadge: {
    backgroundColor: appColors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2
  },
  focusBadgeText: {
    color: appColors.text
  },
  riskBadgeText: {
    fontSize: 12,
    fontWeight: '600'
  },
  riskBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.overlayBackground,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.md
  },
  riskBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6
  }
});
