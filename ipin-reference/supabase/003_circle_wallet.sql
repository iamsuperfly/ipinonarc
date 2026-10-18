-- New file. Do not re-run schema.sql or 002_profile.sql.
-- Marks the Circle Arc wallet and lets it be the active one.

alter table public.wallets add column if not exists kind text not null default 'connected';
