import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { defaultAccount, demoTransactions, defaultIncomeCategories, defaultExpenseCategories } from '../data/demoData';

const useStore = create(
  persist(
    (set, get) => ({
      // ── State ───────────────────────────────────────
      account: defaultAccount,
      transactions: demoTransactions,
      timeframe: 90,

      // ── Settings ────────────────────────────────────
      settings: {
        theme: 'dark',
        cautionThreshold: 1000,
        weekStartsOn: 1, // 0 = Sunday, 1 = Monday
        hiddenIncomeCategories: [],
        hiddenExpenseCategories: [],
        customIncomeCategories: [],
        customExpenseCategories: [],
        hasCompletedOnboarding: false,
      },

      // ── Actions ─────────────────────────────────────
      updateBalance: (newBalance) =>
        set((state) => ({
          account: {
            ...state.account,
            currentBalance: newBalance,
            lastUpdated: new Date().toISOString(),
          },
        })),

      addTransaction: (txn) =>
        set((state) => ({
          transactions: [
            ...state.transactions,
            {
              ...txn,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })),

      updateTransaction: (id, updates) =>
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t
          ),
        })),

      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        })),

      setTimeframe: (days) => set({ timeframe: days }),

      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      addCustomCategory: (type, category) =>
        set((state) => {
          const key = type === 'income' ? 'customIncomeCategories' : 'customExpenseCategories';
          const existing = state.settings[key] || [];
          if (existing.includes(category)) return state;
          return {
            settings: { ...state.settings, [key]: [...existing, category] },
          };
        }),

      removeCategory: (type, category) =>
        set((state) => {
          const hiddenKey = type === 'income' ? 'hiddenIncomeCategories' : 'hiddenExpenseCategories';
          const customKey = type === 'income' ? 'customIncomeCategories' : 'customExpenseCategories';
          const hidden = state.settings[hiddenKey] || [];
          const custom = state.settings[customKey] || [];
          return {
            settings: {
              ...state.settings,
              [hiddenKey]: [...hidden, category],
              [customKey]: custom.filter((c) => c !== category),
            },
          };
        }),

      restoreCategory: (type, category) =>
        set((state) => {
          const hiddenKey = type === 'income' ? 'hiddenIncomeCategories' : 'hiddenExpenseCategories';
          const hidden = state.settings[hiddenKey] || [];
          return {
            settings: {
              ...state.settings,
              [hiddenKey]: hidden.filter((c) => c !== category),
            },
          };
        }),

      completeOnboarding: (balance, incomeEntries, expenseEntries) =>
        set((state) => {
          const now = new Date().toISOString();
          const newTxns = [];
          const incomes = Array.isArray(incomeEntries) ? incomeEntries : incomeEntries ? [incomeEntries] : [];
          const expenses = Array.isArray(expenseEntries) ? expenseEntries : expenseEntries ? [expenseEntries] : [];
          for (const entry of incomes) {
            newTxns.push({
              ...entry,
              id: crypto.randomUUID(),
              type: 'income',
              isActive: true,
              createdAt: now,
              updatedAt: now,
              endDate: entry.frequency === 'one-time' ? entry.startDate : null,
            });
          }
          for (const entry of expenses) {
            newTxns.push({
              ...entry,
              id: crypto.randomUUID(),
              type: 'expense',
              isActive: true,
              createdAt: now,
              updatedAt: now,
              endDate: entry.frequency === 'one-time' ? entry.startDate : null,
            });
          }
          return {
            account: {
              ...state.account,
              currentBalance: balance ?? state.account.currentBalance,
              lastUpdated: now,
            },
            transactions: newTxns,
            settings: { ...state.settings, hasCompletedOnboarding: true },
          };
        }),

      resetAll: () =>
        set({
          account: { ...defaultAccount, lastUpdated: new Date().toISOString() },
          transactions: [],
          timeframe: 90,
          settings: {
            theme: 'dark',
            cautionThreshold: 1000,
            weekStartsOn: 1,
            hiddenIncomeCategories: [],
            hiddenExpenseCategories: [],
            customIncomeCategories: [],
            customExpenseCategories: [],
            hasCompletedOnboarding: false,
          },
        }),

      // Helper: get active categories (defaults + custom - hidden)
      getCategories: (type) => {
        const state = get();
        const defaults = type === 'income' ? defaultIncomeCategories : defaultExpenseCategories;
        const custom = type === 'income'
          ? (state.settings.customIncomeCategories || [])
          : (state.settings.customExpenseCategories || []);
        const hidden = type === 'income'
          ? (state.settings.hiddenIncomeCategories || [])
          : (state.settings.hiddenExpenseCategories || []);
        return [...defaults, ...custom].filter((c) => !hidden.includes(c));
      },
    }),
    {
      name: 'nlb_store',
    }
  )
);

export default useStore;
