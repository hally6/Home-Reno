import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { LoadError } from '@/components/LoadError';
import { useAppContext } from '@/state/AppContext';
import { deleteQuote, getQuoteList, selectQuote, type QuoteListItem } from '@/data/repositories/quoteRepository';
import { appColors } from '@/theme/tokens';
import { formatCurrency, formatOptionLabel } from '@/utils/format';
import type { HomeStackParamList } from '@/navigation/types';

function getCompareSummary(quotes: QuoteListItem[]): { selected: QuoteListItem | null; lowest: QuoteListItem | null } {
  const selected = quotes.find((quote) => quote.status === 'selected') ?? null;
  const pricedQuotes = quotes.filter((quote) => quote.amount > 0);
  const lowest = pricedQuotes.length > 0 ? [...pricedQuotes].sort((a, b) => a.amount - b.amount)[0] : null;
  return { selected, lowest };
}

type Props = NativeStackScreenProps<HomeStackParamList, 'Quotes'>;

export function QuotesScreen({ navigation }: Props): React.JSX.Element {
  const { projectId, refreshData, refreshToken } = useAppContext();
  const [quotes, setQuotes] = React.useState<QuoteListItem[]>([]);
  const [loadError, setLoadError] = React.useState('');
  const [retryKey, setRetryKey] = React.useState(0);

  useFocusEffect(
    React.useCallback(() => {
      void refreshToken;
      void retryKey;
      let active = true;
      getQuoteList(projectId)
        .then((result) => {
          if (active) {
            setQuotes(result);
            setLoadError('');
          }
        })
        .catch((error) => {
          if (active) {
            setLoadError(error instanceof Error ? error.message : 'Failed to load quotes');
          }
        });

      return () => {
        active = false;
      };
    }, [projectId, refreshToken, retryKey])
  );

  const { selected, lowest } = getCompareSummary(quotes);

  const onDeleteQuote = (quote: QuoteListItem): void => {
    Alert.alert('Delete quote?', `Delete quote from ${quote.builderName}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteQuote(projectId, quote.id);
            refreshData();
          } catch (error) {
            Alert.alert('Delete failed', error instanceof Error ? error.message : 'Failed to delete quote');
          }
        }
      }
    ]);
  };

  const onSelectQuote = (quote: QuoteListItem): void => {
    Alert.alert('Select this quote?', `${quote.builderName} will be marked as selected for comparison and planning.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Select',
        onPress: async () => {
          try {
            await selectQuote(projectId, quote.id);
            refreshData();
          } catch (error) {
            Alert.alert('Select failed', error instanceof Error ? error.message : 'Failed to select quote');
          }
        }
      }
    ]);
  };

  return (
    <Screen>
      {loadError ? (
        <LoadError title="Quotes unavailable" message={loadError} onRetry={() => setRetryKey((value) => value + 1)} />
      ) : null}
      <Card
        title="Quote comparison"
        subtitle={`Total quotes: ${quotes.length}${selected ? `  Selected: ${selected.builderName}` : '  Selected: none'}`}
      />
      <Card
        title="Best price snapshot"
        subtitle={
          lowest
            ? `${lowest.builderName}  ${formatCurrency(lowest.amount, lowest.currency)}`
            : 'Add at least one quote with an amount to compare'
        }
      />
      <PrimaryButton title="Add quote" onPress={() => navigation.navigate('QuoteForm')} />

      {quotes.length === 0 ? (
        <Card title="No quotes yet" subtitle="Capture quotes to compare builders and choose one." />
      ) : null}

      {quotes.map((quote) => (
        <Card
          key={quote.id}
          title={`${quote.builderName}  ${formatCurrency(quote.amount, quote.currency)}`}
          subtitle={`${quote.title}  ${formatOptionLabel(quote.status)}  ${quote.roomName ?? 'Project-level'}`}
          onPress={() => navigation.navigate('QuoteForm', { quoteId: quote.id })}
        >
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.iconBtn, quote.status === 'selected' && styles.selectedBtn]}
              onPress={(event) => {
                event.stopPropagation();
                if (quote.status !== 'selected') {
                  onSelectQuote(quote);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={`Select quote from ${quote.builderName}`}
            >
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </Pressable>
            <Pressable
              style={styles.iconBtn}
              onPress={(event) => {
                event.stopPropagation();
                navigation.navigate('QuoteForm', { quoteId: quote.id });
              }}
              accessibilityRole="button"
              accessibilityLabel={`Edit quote from ${quote.builderName}`}
            >
              <Ionicons name="pencil" size={16} color="#FFFFFF" />
            </Pressable>
            <Pressable
              style={[styles.iconBtn, styles.deleteBtn]}
              onPress={(event) => {
                event.stopPropagation();
                onDeleteQuote(quote);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Delete quote from ${quote.builderName}`}
            >
              <Ionicons name="trash" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
          {quote.scope ? <Text style={styles.scopeText}>Scope: {quote.scope}</Text> : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  iconBtn: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8
  },
  selectedBtn: {
    backgroundColor: appColors.primary
  },
  deleteBtn: {
    backgroundColor: appColors.danger
  },
  scopeText: {
    marginTop: 8,
    color: appColors.textMuted
  }
});
