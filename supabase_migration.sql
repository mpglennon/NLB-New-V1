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
  frequency text not null check (frequency in ('one-time', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'annually')),
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

-- ── REALTIME ────────────────────────────────────────────────
-- Enable realtime for cross-device sync
alter publication supabase_realtime add table public.accounts;
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.settings;
