-- NLBCash Database Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- ── ACCOUNTS ────────────────────────────────────────────────
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'Main Checking',
  current_balance numeric not null default 0,
  last_updated timestamptz not null default now(),
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.accounts enable row level security;

create policy "Users can read own account"
  on public.accounts for select using (auth.uid() = user_id);
create policy "Users can insert own account"
  on public.accounts for insert with check (auth.uid() = user_id);
create policy "Users can update own account"
  on public.accounts for update using (auth.uid() = user_id);

-- ── TRANSACTIONS ────────────────────────────────────────────
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  description text default '',
  amount numeric not null check (amount > 0),
  frequency text not null check (frequency in ('one-time', 'weekly', 'bi-weekly', 'semi-monthly', 'monthly', 'quarterly', 'annually', 'custom-days')),
  custom_day_interval integer check (custom_day_interval is null or custom_day_interval >= 1),
  start_date date not null,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_transactions_user on public.transactions(user_id);

alter table public.transactions enable row level security;

create policy "Users can read own transactions"
  on public.transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions"
  on public.transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions"
  on public.transactions for update using (auth.uid() = user_id);
create policy "Users can delete own transactions"
  on public.transactions for delete using (auth.uid() = user_id);

-- ── SETTINGS ────────────────────────────────────────────────
create table public.settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  theme text not null default 'dark',
  caution_threshold numeric not null default 1000,
  week_starts_on integer not null default 1,
  hidden_income_categories text[] default '{}',
  hidden_expense_categories text[] default '{}',
  custom_income_categories text[] default '{}',
  custom_expense_categories text[] default '{}',
  has_completed_onboarding boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.settings enable row level security;

create policy "Users can read own settings"
  on public.settings for select using (auth.uid() = user_id);
create policy "Users can insert own settings"
  on public.settings for insert with check (auth.uid() = user_id);
create policy "Users can update own settings"
  on public.settings for update using (auth.uid() = user_id);

-- ── MIGRATION: Subcategory + Classification + Default View ──────
-- Run these ALTERs on existing databases. Safe to re-run (IF NOT EXISTS).

-- Add subcategory to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS subcategory text DEFAULT NULL;

-- Add exclude_dates to transactions (may already exist from prior migration)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS exclude_dates text[] DEFAULT '{}';

-- Add custom recurring interval support
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS custom_day_interval integer;

-- Ensure frequency check supports all in-app options (semi-monthly + custom-days)
DO $$
DECLARE
  c_name text;
BEGIN
  SELECT conname INTO c_name
  FROM pg_constraint
  WHERE conrelid = 'public.transactions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%frequency%';

  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.transactions DROP CONSTRAINT %I', c_name);
  END IF;

  ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_frequency_check
    CHECK (frequency in ('one-time', 'weekly', 'bi-weekly', 'semi-monthly', 'monthly', 'quarterly', 'annually', 'custom-days'));
END $$;

-- Add sanity check for custom day intervals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_custom_day_interval_check'
      AND conrelid = 'public.transactions'::regclass
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_custom_day_interval_check
      CHECK (custom_day_interval IS NULL OR custom_day_interval >= 1);
  END IF;
END $$;

-- Add category hierarchy and classification to settings
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS category_hierarchy jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS category_classification jsonb DEFAULT '{
  "Rent": "non-negotiable",
  "Rent/Mortgage": "non-negotiable",
  "Car Payment": "non-negotiable",
  "Insurance": "non-negotiable",
  "Utilities": "non-negotiable",
  "Phone Bill": "non-negotiable",
  "Loan Payments": "non-negotiable",
  "Groceries": "non-negotiable",
  "Childcare": "non-negotiable",
  "Dining Out": "flex",
  "Shopping": "flex",
  "Entertainment": "flex",
  "Gas": "flex",
  "Personal Care": "flex",
  "Travel": "flex",
  "Subscriptions": "flex"
}'::jsonb;

-- Add default view preference
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS default_view text DEFAULT 'rolling-30';

-- ── REALTIME ────────────────────────────────────────────────
-- Enable realtime for cross-device sync
alter publication supabase_realtime add table public.accounts;
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.settings;
