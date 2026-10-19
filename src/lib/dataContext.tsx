import { createContext, useContext, type ReactNode } from 'react';
import type { DataSource } from './data';

const DataContext = createContext<DataSource | null>(null);

export function DataProvider({ source, children }: { source: DataSource; children: ReactNode }) {
  return <DataContext.Provider value={source}>{children}</DataContext.Provider>;
}

export function useData(): DataSource {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
