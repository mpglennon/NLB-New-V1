-- Add exclude_dates column for single-occurrence overrides on recurring transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS exclude_dates text[] DEFAULT '{}';
