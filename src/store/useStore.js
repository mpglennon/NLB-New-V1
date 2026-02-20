import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { defaultAccount, defaultIncomeCategories, defaultExpenseCategories } from '../data/demoData';

// ── Supabase helpers — map between JS camelCase and DB snake_case ───

function txnToRow(txn, userId) {
  return {
    id: txn.id,
    user_id: userId,
    type: txn.type,
    category: txn.category,
    description: txn.description || '',
    amount: txn.amount,
    frequency: txn.frequency,
    start_date: txn.startDate,
    end_date: txn.endDate || null,
    is_active: txn.isActive,
    exclude_dates: txn.excludeDates || [],
    created_at: txn.createdAt,
    updated_at: txn.updatedAt,
  };
}

function rowToTxn(row) {
  return {
    id: row.id,
    type: row.type,
    category: row.category,
    description: row.description || '',
    amount: Number(row.amount),
    frequency: row.frequency,
    startDate: row.start_date,
    endDate: row.end_date || null,
    isActive: row.is_active,
    excludeDates: row.exclude_dates || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function settingsToRow(settings, userId) {
  return {
    user_id: userId,
    theme: settings.theme,
    caution_threshold: settings.cautionThreshold,
    week_starts_on: settings.weekStartsOn,
    hidden_income_categories: settings.hiddenIncomeCategories || [],
    hidden_expense_categories: settings.hiddenExpenseCategories || [],
    custom_income_categories: settings.customIncomeCategories || [],
    custom_expense_categories: settings.customExpenseCategories || [],
    has_completed_onboarding: settings.hasCompletedOnboarding,
  };
}

function rowToSettings(row) {
  return {
    theme: row.theme,
    cautionThreshold: Number(row.caution_threshold),
    weekStartsOn: row.week_starts_on,
    hiddenIncomeCategories: row.hidden_income_categories || [],
    hiddenExpenseCategories: row.hidden_expense_categories || [],
    customIncomeCategories: row.custom_income_categories || [],
    customExpenseCategories: row.custom_expense_categories || [],
    hasCompletedOnboarding: row.has_completed_onboarding,
  };
}

// ── Default settings ────────────────────────────────────────────────

const defaultSettings = {
  theme: 'dark',
  cautionThreshold: 1000,
  weekStartsOn: 1,
  hiddenIncomeCategories: [],
  hiddenExpenseCategories: [],
  customIncomeCategories: [],
  customExpenseCategories: [],
  hasCompletedOnboarding: false,
};

// ── Store ───────────────────────────────────────────────────────────

const useStore = create(
  persist(
    (set, get) => ({
      // ── State ──────────────────────────────────────────
      account: { ...defaultAccount, currentBalance: 0 },
      transactions: [],
      timeframe: 30,
      viewMonth: null, // null = rolling, "YYYY-MM" = discrete month
      settings: { ...defaultSettings },

      // ── Auth state ─────────────────────────────────────
      userId: null,
      syncing: false,

      setUserId: (uid) => set({ userId: uid }),

      // ── Load all data from Supabase for current user ──
      loadFromSupabase: async () => {
        const uid = get().userId;
        if (!uid) return;
        set({ syncing: true });

        const [accountRes, txnRes, settingsRes] = await Promise.all([
          supabase.from('accounts').select('*').eq('user_id', uid).single(),
          supabase.from('transactions').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
          supabase.from('settings').select('*').eq('user_id', uid).single(),
        ]);

        const updates = {};

        if (accountRes.data) {
          updates.account = {
            id: accountRes.data.id,
            name: accountRes.data.name,
            currentBalance: Number(accountRes.data.current_balance),
            lastUpdated: accountRes.data.last_updated,
            currency: accountRes.data.currency,
          };
        } else {
          const { data } = await supabase.from('accounts').insert({
            user_id: uid,
            name: 'Main Checking',
            current_balance: 0,
            currency: 'USD',
          }).select().single();
          if (data) {
            updates.account = {
              id: data.id,
              name: data.name,
              currentBalance: Number(data.current_balance),
              lastUpdated: data.last_updated,
              currency: data.currency,
            };
          }
        }

        if (txnRes.data) {
          updates.transactions = txnRes.data.map(rowToTxn);
        }

        if (settingsRes.data) {
          updates.settings = rowToSettings(settingsRes.data);
        } else {
          const { data } = await supabase.from('settings').insert({
            user_id: uid,
            ...settingsToRow(defaultSettings, uid),
          }).select().single();
          if (data) updates.settings = rowToSettings(data);
        }

        updates.syncing = false;
        set(updates);
      },

      // ── Actions (update Zustand optimistically, persist to Supabase) ──

      updateBalance: async (newBalance) => {
        const now = new Date().toISOString();
        set((state) => ({
          account: { ...state.account, currentBalance: newBalance, lastUpdated: now },
        }));
        const uid = get().userId;
        if (uid) {
          await supabase.from('accounts').update({
            current_balance: newBalance,
            last_updated: now,
          }).eq('user_id', uid);
        }
      },

      addTransaction: async (txn) => {
        const now = new Date().toISOString();
        const newTxn = {
          ...txn,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ transactions: [...state.transactions, newTxn] }));
        const uid = get().userId;
        if (uid) {
          await supabase.from('transactions').insert(txnToRow(newTxn, uid));
        }
      },

      updateTransaction: async (id, updates) => {
        const now = new Date().toISOString();
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: now } : t
          ),
        }));
        const uid = get().userId;
        if (uid) {
          const row = {};
          if (updates.category !== undefined) row.category = updates.category;
          if (updates.description !== undefined) row.description = updates.description;
          if (updates.amount !== undefined) row.amount = updates.amount;
          if (updates.frequency !== undefined) row.frequency = updates.frequency;
          if (updates.startDate !== undefined) row.start_date = updates.startDate;
          if (updates.endDate !== undefined) row.end_date = updates.endDate;
          if (updates.isActive !== undefined) row.is_active = updates.isActive;
          if (updates.excludeDates !== undefined) row.exclude_dates = updates.excludeDates;
          row.updated_at = now;
          await supabase.from('transactions').update(row).eq('id', id).eq('user_id', uid);
        }
      },

      deleteTransaction: async (id) => {
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        }));
        const uid = get().userId;
        if (uid) {
          await supabase.from('transactions').delete().eq('id', id).eq('user_id', uid);
        }
      },

      setTimeframe: (days) => set({ timeframe: days, viewMonth: null }),
      setViewMonth: (month) => set({ viewMonth: month }),

      updateSettings: async (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
        const uid = get().userId;
        if (uid) {
          const row = {};
          if (updates.theme !== undefined) row.theme = updates.theme;
          if (updates.cautionThreshold !== undefined) row.caution_threshold = updates.cautionThreshold;
          if (updates.weekStartsOn !== undefined) row.week_starts_on = updates.weekStartsOn;
          if (updates.hiddenIncomeCategories !== undefined) row.hidden_income_categories = updates.hiddenIncomeCategories;
          if (updates.hiddenExpenseCategories !== undefined) row.hidden_expense_categories = updates.hiddenExpenseCategories;
          if (updates.customIncomeCategories !== undefined) row.custom_income_categories = updates.customIncomeCategories;
          if (updates.customExpenseCategories !== undefined) row.custom_expense_categories = updates.customExpenseCategories;
          if (updates.hasCompletedOnboarding !== undefined) row.has_completed_onboarding = updates.hasCompletedOnboarding;
          await supabase.from('settings').update(row).eq('user_id', uid);
        }
      },

      addCustomCategory: async (type, category) => {
        const state = get();
        const key = type === 'income' ? 'customIncomeCategories' : 'customExpenseCategories';
        const existing = state.settings[key] || [];
        if (existing.includes(category)) return;
        const updated = [...existing, category];
        set({ settings: { ...state.settings, [key]: updated } });
        const uid = state.userId;
        if (uid) {
          const dbKey = type === 'income' ? 'custom_income_categories' : 'custom_expense_categories';
          await supabase.from('settings').update({ [dbKey]: updated }).eq('user_id', uid);
        }
      },

      removeCategory: async (type, category) => {
        const state = get();
        const hiddenKey = type === 'income' ? 'hiddenIncomeCategories' : 'hiddenExpenseCategories';
        const customKey = type === 'income' ? 'customIncomeCategories' : 'customExpenseCategories';
        const hidden = [...(state.settings[hiddenKey] || []), category];
        const custom = (state.settings[customKey] || []).filter((c) => c !== category);
        const newSettings = { ...state.settings, [hiddenKey]: hidden, [customKey]: custom };
        set({ settings: newSettings });
        const uid = state.userId;
        if (uid) {
          const dbHidden = type === 'income' ? 'hidden_income_categories' : 'hidden_expense_categories';
          const dbCustom = type === 'income' ? 'custom_income_categories' : 'custom_expense_categories';
          await supabase.from('settings').update({ [dbHidden]: hidden, [dbCustom]: custom }).eq('user_id', uid);
        }
      },

      restoreCategory: async (type, category) => {
        const state = get();
        const hiddenKey = type === 'income' ? 'hiddenIncomeCategories' : 'hiddenExpenseCategories';
        const hidden = (state.settings[hiddenKey] || []).filter((c) => c !== category);
        const newSettings = { ...state.settings, [hiddenKey]: hidden };
        set({ settings: newSettings });
        const uid = state.userId;
        if (uid) {
          const dbKey = type === 'income' ? 'hidden_income_categories' : 'hidden_expense_categories';
          await supabase.from('settings').update({ [dbKey]: hidden }).eq('user_id', uid);
        }
      },

      completeOnboarding: async (balance, incomeEntries, expenseEntries) => {
        const now = new Date().toISOString();
        const uid = get().userId;
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

        const newBalance = balance ?? get().account.currentBalance;
        set((state) => ({
          account: { ...state.account, currentBalance: newBalance, lastUpdated: now },
          transactions: newTxns,
          settings: { ...state.settings, hasCompletedOnboarding: true },
        }));

        if (uid) {
          await supabase.from('accounts').update({
            current_balance: newBalance,
            last_updated: now,
          }).eq('user_id', uid);

          // Clear old transactions and insert new
          await supabase.from('transactions').delete().eq('user_id', uid);
          if (newTxns.length > 0) {
            await supabase.from('transactions').insert(newTxns.map((t) => txnToRow(t, uid)));
          }

          await supabase.from('settings').update({
            has_completed_onboarding: true,
          }).eq('user_id', uid);
        }
      },

      resetAll: async () => {
        const uid = get().userId;
        const now = new Date().toISOString();
        set({
          account: { ...defaultAccount, currentBalance: 0, lastUpdated: now },
          transactions: [],
          timeframe: 30,
          settings: { ...defaultSettings },
        });
        if (uid) {
          await Promise.all([
            supabase.from('accounts').update({ current_balance: 0, last_updated: now, name: 'Main Checking' }).eq('user_id', uid),
            supabase.from('transactions').delete().eq('user_id', uid),
            supabase.from('settings').update(settingsToRow(defaultSettings, uid)).eq('user_id', uid),
          ]);
        }
      },

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

      // ── Sign out ───────────────────────────────────────
      signOut: async () => {
        await supabase.auth.signOut();
        set({
          userId: null,
          account: { ...defaultAccount, currentBalance: 0 },
          transactions: [],
          settings: { ...defaultSettings },
        });
        localStorage.removeItem('nlb_store');
      },
    }),
    {
      name: 'nlb_store',
      partialize: (state) => ({
        account: state.account,
        transactions: state.transactions,
        settings: state.settings,
        userId: state.userId,
      }),
    }
  )
);

export default useStore;
