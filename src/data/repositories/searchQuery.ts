export type SearchSortBy = 'relevance' | 'date' | 'updated';

export type SearchParams = {
  query: string;
  roomId: string | null;
  status: string | null;
  phase: string | null;
  category: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  sortBy: SearchSortBy;
};

type SearchResultBase = {
  id: string;
  title: string;
  roomName: string | null;
  date: string | null;
  updatedAt: string | null;
  relevance: number;
};

export type TaskSearchResult = SearchResultBase & {
  kind: 'task';
  status: string;
  phase: string;
};

export type EventSearchResult = SearchResultBase & {
  kind: 'event';
  subtype: string;
};

export type ExpenseSearchResult = SearchResultBase & {
  kind: 'expense';
  subtype: string;
  amount: number;
};

export type SearchResult = TaskSearchResult | EventSearchResult | ExpenseSearchResult;

function scoreTextMatch(text: string, query: string): number {
  if (!query) {
    return 0;
  }
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  if (normalizedText === normalizedQuery) {
    return 100;
  }
  if (normalizedText.startsWith(normalizedQuery)) {
    return 50;
  }
  if (normalizedText.includes(normalizedQuery)) {
    return 20;
  }
  return 0;
}

export function scoreSearchResult(result: SearchResult, query: string): number {
  const titleScore = scoreTextMatch(result.title, query);
  const roomScore = result.roomName ? Math.floor(scoreTextMatch(result.roomName, query) * 0.5) : 0;
  const subtypeScore =
    result.kind === 'task'
      ? Math.max(scoreTextMatch(result.phase, query), scoreTextMatch(result.status, query))
      : scoreTextMatch(result.subtype, query);

  return Math.max(titleScore, roomScore, subtypeScore);
}

export function sortSearchResults(results: SearchResult[], params: SearchParams): SearchResult[] {
  return [...results].sort((a, b) => {
    if (params.sortBy === 'relevance') {
      if (b.relevance !== a.relevance) {
        return b.relevance - a.relevance;
      }
      const bDate = b.date ?? '';
      const aDate = a.date ?? '';
      return bDate.localeCompare(aDate);
    }

    if (params.sortBy === 'date') {
      const bDate = b.date ?? '';
      const aDate = a.date ?? '';
      if (bDate !== aDate) {
        return bDate.localeCompare(aDate);
      }
      return b.relevance - a.relevance;
    }

    const bUpdated = b.updatedAt ?? '';
    const aUpdated = a.updatedAt ?? '';
    if (bUpdated !== aUpdated) {
      return bUpdated.localeCompare(aUpdated);
    }
    return b.relevance - a.relevance;
  });
}
