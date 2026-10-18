-- New file. Do not re-run schema.sql.
-- Adds a picture on the profile you already created.

alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar read" on storage.objects
for select using (bucket_id = 'avatars');

create policy "avatar insert own" on storage.objects
for insert with check (
  bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "avatar update own" on storage.objects
for update using (
  bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
);
