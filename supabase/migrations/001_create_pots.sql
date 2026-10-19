-- IPIN: pots table
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query → Run)
-- or via `supabase db push` if you use the Supabase CLI.

create table if not exists public.pots (
  id              bigserial    primary key,
  pot_id          bigint       not null,
  owner           text         not null,
  name            text         not null,
  total_allocated numeric      not null,
  tx_hash         text         not null,
  chain_id        bigint       not null default 5042002,
  created_at      timestamptz  not null default now()
);

create index if not exists pots_owner_idx
  on public.pots (lower(owner));

create unique index if not exists pots_pot_id_chain_idx
  on public.pots (pot_id, chain_id);

-- Row Level Security
alter table public.pots enable row level security;

-- Anyone can read pot records (pot IDs are not sensitive)
create policy "read pots"
  on public.pots for select
  using (true);

-- Anyone can insert (wallet address is the identity — no auth layer)
create policy "insert pots"
  on public.pots for insert
  with check (true);
