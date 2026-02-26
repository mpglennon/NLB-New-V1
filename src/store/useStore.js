import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { defaultAccount, defaultIncomeCategories, defaultExpenseCategories, defaultCategoryClassification, defaultCategoryHierarchy } from '../data/demoData';

// ── Supabase helpers — map between JS camelCase and DB snake_case ───

function txnToRow(txn, userId) {
  return {
    id: txn.id,
    user_id: userId,
    type: txn.type,
    category: txn.category,
    subcategory: txn.subcategory || null,
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
    subcategory: row.subcategory || null,
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
    default_view: settings.defaultView || 'current-month',
    category_hierarchy: settings.categoryHierarchy || {},
    category_classification: settings.categoryClassification || defaultCategoryClassification,
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
    defaultView: row.default_view || 'current-month',
    categoryHierarchy: (row.category_hierarchy && Object.keys(row.category_hierarchy).length > 0) ? row.category_hierarchy : { ...defaultCategoryHierarchy },
    categoryClassification: row.category_classification || defaultCategoryClassification,
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
  defaultView: 'current-month',
  categoryHierarchy: { ...defaultCategoryHierarchy },
  categoryClassification: { ...defaultCategoryClassification },
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

      // ── Sync tracking ────────────────────────────────────
      // dirtyIds: transactions modified locally but not yet confirmed on server
      // pendingDeletes: IDs deleted locally but not yet confirmed on server
      dirtyIds: [],
      pendingDeletes: [],

      // ── Auth state ─────────────────────────────────────
      userId: null,
      syncing: false,
      syncStatus: 'synced', // 'synced' | 'syncing' | 'error'
      lastSyncError: null,

      setUserId: (uid) => set({ userId: uid }),

      // ── Load all data from Supabase for current user ──
      loadFromSupabase: async () => {
        const uid = get().userId;
        if (!uid) return;
        set({ syncing: true, syncStatus: 'syncing' });

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
          // Smart merge: respect local edits, pending deletes, and local-only adds.
          const serverTxns = txnRes.data.map(rowToTxn);
          const localTxns = get().transactions;
          const dirty = new Set(get().dirtyIds || []);
          const pendingDel = new Set(get().pendingDeletes || []);

          // Build local lookup by ID
          const localById = new Map(localTxns.map((t) => [t.id, t]));

          // For each server transaction: use local version if it's dirty (newer),
          // skip if it's pending deletion
          const merged = [];
          const serverIds = new Set();
          for (const st of serverTxns) {
            serverIds.add(st.id);
            if (pendingDel.has(st.id)) continue; // locally deleted, skip
            const local = localById.get(st.id);
            if (local && dirty.has(st.id)) {
              // Local edit not yet synced — keep local version
              merged.push(local);
            } else {
              merged.push(st);
            }
          }

          // Add local-only transactions ONLY if they're dirty (created/edited on this device
          // but not yet confirmed on server). Non-dirty local transactions missing from server
          // were deleted by another device — don't resurrect them.
          const localOnly = localTxns.filter((t) => !serverIds.has(t.id) && !pendingDel.has(t.id) && dirty.has(t.id));
          updates.transactions = [...merged, ...localOnly];

          // Push dirty local-only adds to Supabase
          if (localOnly.length > 0) {
            supabase.from('transactions').insert(localOnly.map((t) => txnToRow(t, uid)))
              .then(({ error }) => {
                if (error) console.error('Sync local-only transactions failed:', error);
              });
          }

          // Retry dirty edits
          const dirtyEdits = [...dirty].filter((id) => serverIds.has(id));
          for (const id of dirtyEdits) {
            const local = localById.get(id);
            if (local) {
              supabase.from('transactions').update(txnToRow(local, uid)).eq('id', id).eq('user_id', uid)
                .then(({ error }) => {
                  if (!error) {
                    set((s) => ({ dirtyIds: s.dirtyIds.filter((d) => d !== id) }));
                  } else {
                    console.error('Retry dirty edit failed:', id, error);
                  }
                });
            }
          }

          // Retry pending deletes
          for (const id of pendingDel) {
            supabase.from('transactions').delete().eq('id', id).eq('user_id', uid)
              .then(({ error }) => {
                if (!error) {
                  set((s) => ({ pendingDeletes: s.pendingDeletes.filter((d) => d !== id) }));
                } else {
                  console.error('Retry pending delete failed:', id, error);
                }
              });
          }
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
        updates.syncStatus = 'synced';
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
        set((state) => ({
          transactions: [...state.transactions, newTxn],
          dirtyIds: [...state.dirtyIds, newTxn.id],
        }));
        const uid = get().userId;
        if (uid) {
          const row = txnToRow(newTxn, uid);
          const { error } = await supabase.from('transactions').insert(row);
          if (error) {
            console.error('addTransaction sync failed:', error);
            set({ syncStatus: 'error', lastSyncError: `Add failed: ${error.message} (${error.code})` });
            // Retry once after a short delay
            setTimeout(async () => {
              const { error: retryErr } = await supabase.from('transactions').insert(row);
              if (retryErr) {
                console.error('addTransaction retry failed:', retryErr);
              } else {
                set((s) => ({
                  syncStatus: 'synced',
                  lastSyncError: null,
                  dirtyIds: s.dirtyIds.filter((d) => d !== newTxn.id),
                }));
              }
            }, 2000);
          } else {
            // Success — clear dirty flag
            set((s) => ({
              dirtyIds: s.dirtyIds.filter((d) => d !== newTxn.id),
            }));
          }
        }
      },

      updateTransaction: async (id, updates) => {
        const now = new Date().toISOString();
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: now } : t
          ),
          dirtyIds: state.dirtyIds.includes(id) ? state.dirtyIds : [...state.dirtyIds, id],
        }));
        const uid = get().userId;
        if (uid) {
          const row = {};
          if (updates.category !== undefined) row.category = updates.category;
          if (updates.subcategory !== undefined) row.subcategory = updates.subcategory;
          if (updates.description !== undefined) row.description = updates.description;
          if (updates.amount !== undefined) row.amount = updates.amount;
          if (updates.frequency !== undefined) row.frequency = updates.frequency;
          if (updates.startDate !== undefined) row.start_date = updates.startDate;
          if (updates.endDate !== undefined) row.end_date = updates.endDate;
          if (updates.isActive !== undefined) row.is_active = updates.isActive;
          if (updates.excludeDates !== undefined) row.exclude_dates = updates.excludeDates;
          row.updated_at = now;
          const { error } = await supabase.from('transactions').update(row).eq('id', id).eq('user_id', uid);
          if (error) {
            console.error('updateTransaction sync failed:', error);
            set({ syncStatus: 'error', lastSyncError: `Edit failed: ${error.message} (${error.code})` });
            // Retry once
            setTimeout(async () => {
              const { error: retryErr } = await supabase.from('transactions').update(row).eq('id', id).eq('user_id', uid);
              if (retryErr) {
                console.error('updateTransaction retry failed:', retryErr);
              } else {
                set((s) => ({
                  syncStatus: 'synced',
                  lastSyncError: null,
                  dirtyIds: s.dirtyIds.filter((d) => d !== id),
                }));
              }
            }, 2000);
          } else {
            set((s) => ({
              dirtyIds: s.dirtyIds.filter((d) => d !== id),
            }));
          }
        }
      },

      deleteTransaction: async (id) => {
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
          pendingDeletes: [...state.pendingDeletes, id],
          dirtyIds: state.dirtyIds.filter((d) => d !== id),
        }));
        const uid = get().userId;
        if (uid) {
          const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', uid);
          if (error) {
            console.error('deleteTransaction sync failed:', error);
            set({ syncStatus: 'error', lastSyncError: `Delete failed: ${error.message} (${error.code})` });
            // Retry once
            setTimeout(async () => {
              const { error: retryErr } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', uid);
              if (retryErr) {
                console.error('deleteTransaction retry failed:', retryErr);
              } else {
                set((s) => ({
                  syncStatus: 'synced',
                  lastSyncError: null,
                  pendingDeletes: s.pendingDeletes.filter((d) => d !== id),
                }));
              }
            }, 2000);
          } else {
            // Success — clear pending delete
            set((s) => ({
              pendingDeletes: s.pendingDeletes.filter((d) => d !== id),
            }));
          }
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
          if (updates.defaultView !== undefined) row.default_view = updates.defaultView;
          if (updates.categoryHierarchy !== undefined) row.category_hierarchy = updates.categoryHierarchy;
          if (updates.categoryClassification !== undefined) row.category_classification = updates.categoryClassification;
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

      updateCategoryHierarchy: async (hierarchy) => {
        const state = get();
        const newSettings = { ...state.settings, categoryHierarchy: hierarchy };
        set({ settings: newSettings });
        const uid = state.userId;
        if (uid) {
          await supabase.from('settings').update({ category_hierarchy: hierarchy }).eq('user_id', uid);
        }
      },

      updateCategoryClassification: async (classification) => {
        const state = get();
        const newSettings = { ...state.settings, categoryClassification: classification };
        set({ settings: newSettings });
        const uid = state.userId;
        if (uid) {
          await supabase.from('settings').update({ category_classification: classification }).eq('user_id', uid);
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
          transactions: [...state.transactions, ...newTxns],
          settings: { ...state.settings, hasCompletedOnboarding: true },
        }));

        if (uid) {
          await supabase.from('accounts').update({
            current_balance: newBalance,
            last_updated: now,
          }).eq('user_id', uid);

          // Append new transactions (never delete existing)
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
          dirtyIds: [],
          pendingDeletes: [],
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
        dirtyIds: state.dirtyIds,
        pendingDeletes: state.pendingDeletes,
      }),
      merge: (persisted, current) => {
        const merged = { ...current, ...persisted };
        // Seed default subcategories for existing users with empty hierarchy
        if (merged.settings && (!merged.settings.categoryHierarchy || Object.keys(merged.settings.categoryHierarchy).length === 0)) {
          merged.settings = { ...merged.settings, categoryHierarchy: { ...defaultCategoryHierarchy } };
        }
        return merged;
      },
    }
  )
);

export default useStore;
