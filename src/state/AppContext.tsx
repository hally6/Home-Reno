import React from 'react';

type AppContextValue = {
  projectId: string;
  refreshToken: number;
  refreshData: () => void;
  themePreference: 'system' | 'light' | 'dark';
  setThemePreference: (value: 'system' | 'light' | 'dark') => void;
  currentError: string | null;
  setError: (message: string) => void;
  clearError: () => void;
};

type AppContextProviderValue = Pick<
  AppContextValue,
  'projectId' | 'refreshToken' | 'refreshData' | 'themePreference' | 'setThemePreference'
>;

const AppContext = React.createContext<AppContextValue | null>(null);

export function AppContextProvider({
  value,
  children
}: {
  value: AppContextProviderValue;
  children: React.ReactNode;
}): React.JSX.Element {
  const [currentError, setCurrentError] = React.useState<string | null>(null);
  const setError = React.useCallback((message: string) => {
    const normalized = message.trim();
    setCurrentError(normalized ? normalized : null);
  }, []);
  const clearError = React.useCallback(() => setCurrentError(null), []);

  const memoizedValue = React.useMemo(
    () => ({
      ...value,
      currentError,
      setError,
      clearError
    }),
    [clearError, currentError, setError, value]
  );

  return <AppContext.Provider value={memoizedValue}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppContextProvider');
  }
  return context;
}
