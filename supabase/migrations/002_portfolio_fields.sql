alter table public.holdings
  add column if not exists fraction_allowed boolean not null default false;

alter table public.portfolio_snapshots
  add column if not exists cash_value numeric(18,2);

alter table public.milestones
  add column if not exists achieved_at timestamptz,
  add column if not exists achieved_value numeric(18,2);

alter table public.profiles
  add column if not exists timezone text not null default 'Asia/Kolkata',
  add column if not exists currency text not null default 'INR',
  add column if not exists theme text not null default 'dark';
