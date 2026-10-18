-- Run in the Supabase SQL editor. Google auth must be enabled first.
-- IPIN account memory. The chain still settles USDC.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles(id) on delete cascade,
  address text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (account_id, address)
);

create unique index if not exists wallets_one_active
  on public.wallets (account_id) where is_active;

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  pot_id bigint,
  pool_amount numeric not null default 0,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.allocations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  recipient text not null,
  amount numeric not null,
  tx_hash text,
  paid boolean not null default false
);

create table if not exists public.distributions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  pot_id bigint,
  gross numeric not null,
  fee numeric not null,
  tx_hash text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.fee_ledger (
  account_id uuid not null references public.profiles(id) on delete cascade,
  month text not null,
  volume numeric not null default 0,
  fees numeric not null default 0,
  primary key (account_id, month)
);

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.campaigns enable row level security;
alter table public.allocations enable row level security;
alter table public.distributions enable row level security;
alter table public.fee_ledger enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own wallets" on public.wallets for all using (auth.uid() = account_id) with check (auth.uid() = account_id);
create policy "own campaigns" on public.campaigns for all using (auth.uid() = account_id) with check (auth.uid() = account_id);
create policy "own allocations" on public.allocations for all using (
  exists (select 1 from public.campaigns c where c.id = campaign_id and c.account_id = auth.uid())
) with check (
  exists (select 1 from public.campaigns c where c.id = campaign_id and c.account_id = auth.uid())
);
create policy "own distributions" on public.distributions for all using (auth.uid() = account_id) with check (auth.uid() = account_id);
create policy "own fees" on public.fee_ledger for all using (auth.uid() = account_id) with check (auth.uid() = account_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();
