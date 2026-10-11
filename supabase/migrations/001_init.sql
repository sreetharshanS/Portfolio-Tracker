create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'User',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  include_in_portfolio boolean not null default true,
  include_in_milestones boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_category_id uuid references public.asset_categories(id) on delete set null,
  asset_name text not null,
  symbol text,
  market_or_country text,
  quantity numeric(18,6) not null check (quantity >= 0),
  cost_basis_per_unit numeric(18,6),
  current_price numeric(18,6),
  currency text not null default 'INR',
  purchase_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  holding_id uuid references public.holdings(id) on delete set null,
  transaction_type text not null,
  transaction_date date not null,
  quantity numeric(18,6),
  unit_price numeric(18,6),
  fees numeric(18,6) not null default 0,
  tax_amount numeric(18,6) not null default 0,
  cash_amount numeric(18,6) not null default 0,
  notes text,
  import_batch_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_category_id uuid not null references public.asset_categories(id) on delete cascade,
  target_percentage numeric(5,2) not null check (target_percentage >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, asset_category_id)
);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(18,2) not null check (target_amount > 0),
  display_order integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.milestone_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  achieved_at timestamptz not null default now(),
  qualifying_portfolio_value numeric(18,2) not null,
  achievement_status text not null default 'achieved',
  created_at timestamptz not null default now(),
  unique (milestone_id, achieved_at)
);

create table if not exists public.portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  total_market_value numeric(18,2) not null,
  total_invested_amount numeric(18,2),
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, snapshot_date)
);

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  status text not null default 'pending',
  total_rows integer not null default 0,
  successful_rows integer not null default 0,
  failed_rows integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_holdings_user_id on public.holdings(user_id);
create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_asset_targets_user_id on public.asset_targets(user_id);
create index if not exists idx_milestones_user_id on public.milestones(user_id);
create index if not exists idx_snapshots_user_id on public.portfolio_snapshots(user_id);

alter table public.profiles enable row level security;
alter table public.asset_categories enable row level security;
alter table public.holdings enable row level security;
alter table public.transactions enable row level security;
alter table public.asset_targets enable row level security;
alter table public.milestones enable row level security;
alter table public.milestone_achievements enable row level security;
alter table public.portfolio_snapshots enable row level security;
alter table public.import_batches enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

create policy "asset_categories_select_own" on public.asset_categories for select using (auth.uid() = user_id);
create policy "asset_categories_insert_own" on public.asset_categories for insert with check (auth.uid() = user_id);
create policy "asset_categories_update_own" on public.asset_categories for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "asset_categories_delete_own" on public.asset_categories for delete using (auth.uid() = user_id);

create policy "holdings_select_own" on public.holdings for select using (auth.uid() = user_id);
create policy "holdings_insert_own" on public.holdings for insert with check (auth.uid() = user_id);
create policy "holdings_update_own" on public.holdings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "holdings_delete_own" on public.holdings for delete using (auth.uid() = user_id);

create policy "transactions_select_own" on public.transactions for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions for delete using (auth.uid() = user_id);

create policy "asset_targets_select_own" on public.asset_targets for select using (auth.uid() = user_id);
create policy "asset_targets_insert_own" on public.asset_targets for insert with check (auth.uid() = user_id);
create policy "asset_targets_update_own" on public.asset_targets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "asset_targets_delete_own" on public.asset_targets for delete using (auth.uid() = user_id);

create policy "milestones_select_own" on public.milestones for select using (auth.uid() = user_id);
create policy "milestones_insert_own" on public.milestones for insert with check (auth.uid() = user_id);
create policy "milestones_update_own" on public.milestones for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "milestones_delete_own" on public.milestones for delete using (auth.uid() = user_id);

create policy "milestone_achievements_select_own" on public.milestone_achievements for select using (auth.uid() = user_id);
create policy "milestone_achievements_insert_own" on public.milestone_achievements for insert with check (auth.uid() = user_id);
create policy "milestone_achievements_update_own" on public.milestone_achievements for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "milestone_achievements_delete_own" on public.milestone_achievements for delete using (auth.uid() = user_id);

create policy "snapshots_select_own" on public.portfolio_snapshots for select using (auth.uid() = user_id);
create policy "snapshots_insert_own" on public.portfolio_snapshots for insert with check (auth.uid() = user_id);
create policy "snapshots_update_own" on public.portfolio_snapshots for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "snapshots_delete_own" on public.portfolio_snapshots for delete using (auth.uid() = user_id);

create policy "import_batches_select_own" on public.import_batches for select using (auth.uid() = user_id);
create policy "import_batches_insert_own" on public.import_batches for insert with check (auth.uid() = user_id);
create policy "import_batches_update_own" on public.import_batches for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "import_batches_delete_own" on public.import_batches for delete using (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on table
  public.profiles,
  public.asset_categories,
  public.holdings,
  public.transactions,
  public.asset_targets,
  public.milestones,
  public.milestone_achievements,
  public.portfolio_snapshots,
  public.import_batches
to authenticated;
