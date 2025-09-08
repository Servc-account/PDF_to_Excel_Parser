import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppStateData, Issue, ParsedInvestorRecord, Locale } from '../types';

interface AppState extends AppStateData {
  locale: Locale;
  setLocale: (l: Locale) => void;
  setData: (records: ParsedInvestorRecord[], issues: Issue[]) => void;
  updateRecord: (id: string, updates: Partial<ParsedInvestorRecord>) => void;
  reset: () => void;
}

function recordKey(r: ParsedInvestorRecord): string {
  return `${r.fileName}:${r.page}:${r.investorId}`;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      records: [],
      issues: [],
      locale: 'en',
      setLocale: (l) => set({ locale: l }),
      setData: (records, issues) => set({ records, issues }),
      updateRecord: (id, updates) => {
        const records = get().records.map((r) => {
          const key = recordKey(r);
          if (key === id) {
            return { ...r, ...updates, edited: true };
          }
          return r;
        });
        set({ records });
      },
      reset: () => set({ records: [], issues: [] })
    }),
    { name: 'fxp-ca-checker' }
  )
);


