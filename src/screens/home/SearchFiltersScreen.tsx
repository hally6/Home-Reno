import React from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/components/Screen';
import { FormInput } from '@/components/FormInput';
import { DateField } from '@/components/DateField';
import { SelectDropdown } from '@/components/SelectDropdown';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAppContext } from '@/state/AppContext';
import { listProjectRooms } from '@/data/repositories/projectRepository';
import { listExpenseCategories, searchProjectPage, type SearchResult } from '@/data/repositories/searchRepository';
import { formatDateTime } from '@/utils/format';
import type { HomeStackParamList } from '@/navigation/types';

const statuses = ['', 'ideas', 'ready', 'in_progress', 'waiting', 'done'];
const phases = ['', 'plan', 'buy', 'prep', 'install', 'finish', 'inspect_snag'];
const SEARCH_DEBOUNCE_MS = 300;

function formatOptionLabel(value: string): string {
  if (!value) {
    return 'Any';
  }
  return value
    .split('_')
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}

function toStartIso(value: string | null): string | null {
  return value ? `${value}T00:00:00.000Z` : null;
}

function toEndIso(value: string | null): string | null {
  return value ? `${value}T23:59:59.999Z` : null;
}

function resultSubtitle(result: SearchResult): string {
  if (result.kind === 'task') {
    return `${result.roomName ?? 'No room'}  ${formatOptionLabel(result.phase)}  ${formatOptionLabel(result.status)}  ${formatDateTime(result.date)}`;
  }
  if (result.kind === 'event') {
    return `${result.roomName ?? 'No room'}  ${formatOptionLabel(result.subtype)}  ${formatDateTime(result.date)}`;
  }
  return `${result.roomName ?? 'No room'}  ${formatOptionLabel(result.subtype)}  ${formatDateTime(result.date)}  Amount ${result.amount}`;
}

type Props = NativeStackScreenProps<HomeStackParamList, 'SearchFilters'>;

export function SearchFiltersScreen({ navigation, route }: Props): React.JSX.Element {
  const initialQuery = route.params?.initialQuery ?? '';
  const { projectId, refreshToken } = useAppContext();
  const [rooms, setRooms] = React.useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [query, setQuery] = React.useState('');
  const [roomId, setRoomId] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [phase, setPhase] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'relevance' | 'date' | 'updated'>('relevance');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [error, setError] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const roomOptions = React.useMemo(
    () => [{ value: '', label: 'Any room' }, ...rooms.map((room) => ({ value: room.id, label: room.name }))],
    [rooms]
  );
  const statusOptions = React.useMemo(
    () => statuses.map((value) => ({ value, label: formatOptionLabel(value) })),
    []
  );
  const phaseOptions = React.useMemo(() => phases.map((value) => ({ value, label: formatOptionLabel(value) })), []);
  const categoryOptions = React.useMemo(
    () => [{ value: '', label: 'Any category' }, ...categories.map((value) => ({ value, label: formatOptionLabel(value) }))],
    [categories]
  );
  const sortOptions = React.useMemo(
    () => [
      { value: 'relevance', label: 'Relevance' },
      { value: 'date', label: 'Date' },
      { value: 'updated', label: 'Updated' }
    ],
    []
  );

  React.useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  useFocusEffect(
    React.useCallback(() => {
      void refreshToken;
      let active = true;
      Promise.all([listProjectRooms(projectId), listExpenseCategories(projectId)])
        .then(([nextRooms, nextCategories]) => {
          if (!active) {
            return;
          }
          setRooms(nextRooms);
          setCategories(nextCategories);
        })
        .catch((loadError) => {
          if (active) {
            setError(loadError instanceof Error ? loadError.message : 'Failed to load filter metadata');
          }
        });

      return () => {
        active = false;
      };
    }, [projectId, refreshToken])
  );

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsSearching(true);
      setError('');
      searchProjectPage(
        projectId,
        {
          query,
          roomId: roomId || null,
          status: status || null,
          phase: phase || null,
          category: category || null,
          dateFrom: toStartIso(dateFrom),
          dateTo: toEndIso(dateTo),
          sortBy
        },
        { limit: 30, cursor: null }
      )
        .then((page) => {
          setResults(page.items);
          setNextCursor(page.nextCursor);
        })
        .catch((searchError) => setError(searchError instanceof Error ? searchError.message : 'Search failed'))
        .finally(() => setIsSearching(false));
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [projectId, query, roomId, status, phase, category, dateFrom, dateTo, sortBy]);

  const loadMore = React.useCallback(() => {
    if (!nextCursor) {
      return;
    }
    setIsSearching(true);
    setError('');
    searchProjectPage(
      projectId,
      {
        query,
        roomId: roomId || null,
        status: status || null,
        phase: phase || null,
        category: category || null,
        dateFrom: toStartIso(dateFrom),
        dateTo: toEndIso(dateTo),
        sortBy
      },
      { limit: 30, cursor: nextCursor }
    )
      .then((page) => {
        setResults((prev) => [...prev, ...page.items]);
        setNextCursor(page.nextCursor);
      })
      .catch((searchError) => setError(searchError instanceof Error ? searchError.message : 'Search failed'))
      .finally(() => setIsSearching(false));
  }, [category, dateFrom, dateTo, nextCursor, phase, projectId, query, roomId, sortBy, status]);

  const onOpenResult = React.useCallback((result: SearchResult): void => {
    if (result.kind === 'task') {
      navigation.navigate('TaskDetail', { taskId: result.id });
      return;
    }
    if (result.kind === 'event') {
      navigation.navigate('EventDetail', { eventId: result.id });
      return;
    }
    navigation.navigate('ExpenseDetail', { expenseId: result.id });
  }, [navigation]);

  return (
    <Screen>
      <FormInput label="Search" value={query} onChangeText={setQuery} placeholder="Task, event, room, category..." />
      <SelectDropdown
        label="Room"
        value={roomId}
        options={roomOptions}
        onChange={setRoomId}
      />
      <SelectDropdown
        label="Status"
        value={status}
        options={statusOptions}
        onChange={setStatus}
      />
      <SelectDropdown
        label="Phase"
        value={phase}
        options={phaseOptions}
        onChange={setPhase}
      />
      <SelectDropdown
        label="Category"
        value={category}
        options={categoryOptions}
        onChange={setCategory}
      />
      <DateField label="Date from" value={dateFrom} onChange={setDateFrom} placeholder="Select start date" />
      <DateField label="Date to" value={dateTo} onChange={setDateTo} placeholder="Select end date" />
      <SelectDropdown
        label="Sort"
        value={sortBy}
        options={sortOptions}
        onChange={(value) => setSortBy(value as 'relevance' | 'date' | 'updated')}
      />

      {error ? <Text style={{ color: 'red', marginBottom: 12 }}>{error}</Text> : null}
      <Card title="Results" subtitle={isSearching ? 'Searching...' : `${results.length} match(es)`}>
        {isSearching ? <LoadingSpinner label="Fetching matches..." /> : null}
      </Card>
      {!isSearching && results.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No results found"
          description="Try broadening the query or clearing a filter."
        />
      ) : null}
      {results.map((result) => (
        <Card
          key={`${result.kind}-${result.id}`}
          title={`${formatOptionLabel(result.kind)}: ${result.title}`}
          subtitle={resultSubtitle(result)}
          onPress={() => onOpenResult(result)}
        />
      ))}
      {nextCursor ? (
        <PrimaryButton title={isSearching ? 'Loading...' : 'Load more'} onPress={loadMore} disabled={isSearching} />
      ) : null}
    </Screen>
  );
}
