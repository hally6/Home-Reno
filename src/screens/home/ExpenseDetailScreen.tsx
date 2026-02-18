import React from 'react';
import { Alert, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { deleteExpense, getExpenseDetail, type ExpenseDetail } from '@/data/repositories/expenseRepository';
import { formatCurrency, formatDate, formatOptionLabel } from '@/utils/format';
import { useAppContext } from '@/state/AppContext';
import { getProjectById } from '@/data/repositories/projectRepository';
import { PrimaryButton } from '@/components/PrimaryButton';
import type { HomeStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'ExpenseDetail'>;

export function ExpenseDetailScreen({ route, navigation }: Props): React.JSX.Element {
  const expenseId = route.params.expenseId;
  const { projectId, refreshData } = useAppContext();

  const [expense, setExpense] = React.useState<ExpenseDetail | null>(null);
  const [currency, setCurrency] = React.useState('USD');

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      Promise.all([getExpenseDetail(expenseId), getProjectById(projectId)])
        .then(([expenseResult, project]) => {
          if (active) {
            setExpense(expenseResult);
            setCurrency(project?.currency ?? 'USD');
          }
        })
        .catch((error) => {
          console.error('Failed to load expense detail', error);
        });

      return () => {
        active = false;
      };
    }, [expenseId, projectId])
  );

  if (!expense) {
    return (
      <Screen>
        <Card title="Expense not found" subtitle={`ID: ${expenseId}`} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Card
        title={expense.vendor ?? 'Expense'}
        subtitle={`${formatOptionLabel(expense.category)}  ${formatDate(expense.incurredOn)}`}
      />
      <PrimaryButton title="Edit expense" onPress={() => navigation.navigate('ExpenseForm', { expenseId })} />
      <PrimaryButton
        title="Delete expense"
        onPress={() =>
          Alert.alert('Delete expense?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteExpense(expenseId, projectId);
                  refreshData();
                  navigation.goBack();
                } catch (error) {
                  Alert.alert('Delete failed', error instanceof Error ? error.message : 'Failed to delete expense');
                }
              }
            }
          ])
        }
      />
      <Text>Amount: {formatCurrency(expense.amount, currency)}</Text>
      <Text>Tax: {expense.taxAmount == null ? '-' : formatCurrency(expense.taxAmount, currency)}</Text>
      <Text>Room: {expense.roomName ?? '-'}</Text>
      <Text>Task: {expense.taskTitle ?? '-'}</Text>
      <Text>Notes: {expense.notes ?? '-'}</Text>
    </Screen>
  );
}
