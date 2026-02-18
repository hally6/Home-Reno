import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryCacheStore } from '@/state/queryCacheStore';

type UseQueryOptions<T> = {
  query: () => Promise<T>;
  initialData: T;
  enabled?: boolean;
  errorMessage?: string;
  cacheKey?: string;
  staleMs?: number;
};

type UseQueryResult<T> = {
  data: T;
  error: string;
  isLoading: boolean;
  reload: () => void;
};

export function useQuery<T>({
  query,
  initialData,
  enabled = true,
  errorMessage = 'Failed to load data',
  cacheKey,
  staleMs = 30000
}: UseQueryOptions<T>): UseQueryResult<T> {
  const [data, setData] = React.useState<T>(initialData);
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [reloadToken, setReloadToken] = React.useState(0);
  const setCacheEntry = useQueryCacheStore((state) => state.setEntry);

  const reload = React.useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  React.useEffect(() => {
    if (!cacheKey) {
      return;
    }
    const entry = useQueryCacheStore.getState().entries[cacheKey];
    if (!entry) {
      return;
    }
    setData(entry.data as T);
  }, [cacheKey]);

  useFocusEffect(
    React.useCallback(() => {
      if (!enabled) {
        return undefined;
      }
      void reloadToken;

      if (cacheKey && reloadToken === 0) {
        const entry = useQueryCacheStore.getState().entries[cacheKey];
        const isFresh = entry ? Date.now() - entry.updatedAt <= staleMs : false;
        if (isFresh) {
          setData(entry.data as T);
          setError('');
          setIsLoading(false);
          return undefined;
        }
      }

      let active = true;
      setIsLoading(true);

      query()
        .then((result) => {
          if (!active) {
            return;
          }
          setData(result);
          setError('');
          if (cacheKey) {
            setCacheEntry(cacheKey, result);
          }
        })
        .catch((fetchError) => {
          if (!active) {
            return;
          }
          setError(fetchError instanceof Error ? fetchError.message : errorMessage);
        })
        .finally(() => {
          if (active) {
            setIsLoading(false);
          }
        });

      return () => {
        active = false;
      };
    }, [cacheKey, enabled, errorMessage, query, reloadToken, setCacheEntry, staleMs])
  );

  return {
    data,
    error,
    isLoading,
    reload
  };
}
