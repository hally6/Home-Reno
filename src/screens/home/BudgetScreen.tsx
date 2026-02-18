import React from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { useAppContext } from '@/state/AppContext';
import {
  getBudgetOverview,
  getRecentExpenses,
  type BudgetOverview,
  type ExpenseListItem
} from '@/data/repositories/expenseRepository';
import { getCostInsightSummary, type CostInsightSummary } from '@/data/repositories/costInsightsRepository';
import { formatBudgetVariance, formatCurrency, formatDate, formatOptionLabel } from '@/utils/format';
import { PrimaryButton } from '@/components/PrimaryButton';
import { LoadError } from '@/components/LoadError';
import { appColors } from '@/theme/tokens';
import type { HomeStackParamList } from '@/navigation/types';
import { useQuery } from '@/hooks/useQuery';

function riskDotColor(risk: 'low' | 'medium' | 'high'): string {
  if (risk === 'high') {
    return appColors.danger;
  }
  if (risk === 'medium') {
    return appColors.accent;
  }
  return appColors.primary;
}

type Props = NativeStackScreenProps<HomeStackParamList, 'Budget'>;

type BudgetScreenData = {
  overview: BudgetOverview;
  recent: ExpenseListItem[];
  costInsights: CostInsightSummary | null;
};

export function BudgetScreen({ navigation }: Props): React.JSX.Element {
  const { projectId, refreshToken } = useAppContext();
  const {
    data,
    error: loadError,
    reload
  } = useQuery<BudgetScreenData | null>({
    query: React.useCallback(async () => {
      void refreshToken;
      const [overview, recent, costInsights] = await Promise.all([
        getBudgetOverview(projectId),
        getRecentExpenses(projectId),
        getCostInsightSummary(projectId)
      ]);
      return { overview, recent, costInsights };
    }, [projectId, refreshToken]),
    initialData: null,
    errorMessage: 'Failed to load budget',
    cacheKey: `budget:${projectId}:${refreshToken}`,
    staleMs: 15000
  });
  const overview = data?.overview ?? null;
  const recent = data?.recent ?? [];
  const costInsights = data?.costInsights ?? null;

  if (!overview) {
    return (
      <Screen>
        {loadError ? <LoadError title="Budget unavailable" message={loadError} onRetry={reload} /> : null}
        <Card title="Budget" subtitle="Loading budget..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <PrimaryButton title="Add expense" onPress={() => navigation.navigate('ExpenseForm')} />
      <Card
        title="Project totals"
        subtitle={`Planned ${formatCurrency(overview.planned, overview.currency)}  Actual ${formatCurrency(overview.actual, overview.currency)}  ${formatBudgetVariance(overview.planned, overview.actual, overview.currency)}`}
      />
      <Card
        title="Cost risk guidance"
        subtitle={
          costInsights
            ? `Variance ${formatCurrency(costInsights.projectVariance, overview.currency)}`
            : 'Loading guidance...'
        }
      >
        {costInsights ? (
          <View style={styles.riskBadgeWrap}>
            <View style={styles.riskBadgeRow}>
              <Text style={styles.riskBadgeText}>Budget risk</Text>
              <View style={[styles.riskBadgeDot, { backgroundColor: riskDotColor(costInsights.projectRisk) }]} />
            </View>
          </View>
        ) : null}
      </Card>
      {costInsights?.reasons.map((reason, idx) => (
        <Card key={`reason-${idx}`} title="Insight" subtitle={reason} />
      ))}
      {costInsights?.roomRisks?.map((room) => (
        <Card
          key={room.roomId}
          title={room.roomName}
          subtitle={`Planned ${formatCurrency(room.planned, overview.currency)}  Actual ${formatCurrency(room.actual, overview.currency)}  Variance ${formatCurrency(room.variance, overview.currency)}  ${room.reasons[0]}`}
        >
          <View style={styles.riskBadgeWrap}>
            <View style={styles.riskBadgeRow}>
              <Text style={styles.riskBadgeText}>Budget risk</Text>
              <View style={[styles.riskBadgeDot, { backgroundColor: riskDotColor(room.risk) }]} />
            </View>
          </View>
        </Card>
      ))}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>By room</Text>
        {overview.byRoom.length === 0 ? (
          <EmptyState icon="wallet-outline" title="No room expenses" description="Track your first expense." />
        ) : (
          overview.byRoom.map((item) => (
            <Card key={item.roomName} title={item.roomName} subtitle={formatCurrency(item.amount, overview.currency)} />
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>By category</Text>
        {overview.byCategory.length === 0 ? (
          <EmptyState icon="wallet-outline" title="No categories yet" description="Track your first expense." />
        ) : (
          overview.byCategory.map((item) => (
            <Card
              key={item.category}
              title={formatOptionLabel(item.category)}
              subtitle={formatCurrency(item.amount, overview.currency)}
            />
          ))
        )}
      </View>

      <View>
        <Text style={styles.sectionTitle}>Recent expenses</Text>
        {recent.length === 0 ? (
          <EmptyState icon="wallet-outline" title="No expenses recorded" description="Track your first expense." />
        ) : (
          recent.map((item) => (
            <Card
              key={item.id}
              title={`${item.vendor ?? 'Expense'} (${formatOptionLabel(item.category)})`}
              subtitle={`${item.roomName ?? 'Unassigned'}  ${formatDate(item.incurredOn)}  ${formatCurrency(item.amount, overview.currency)}`}
              onPress={() => navigation.navigate('ExpenseDetail', { expenseId: item.id })}
            />
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = {
  section: {
    marginBottom: 10
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: '600' as const
  },
  riskBadgeWrap: {
    position: 'absolute' as const,
    right: 28,
    top: 12,
    backgroundColor: appColors.overlayBackground,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8
  },
  riskBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const
  },
  riskBadgeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const
  },
  riskBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6
  }
};
