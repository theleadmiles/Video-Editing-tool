-- ─────────────────────────────────────────────────────────────
-- Boltcut — Storage Buckets
-- Run this in Supabase SQL Editor after migration 001
-- ─────────────────────────────────────────────────────────────

-- Create assets bucket (for voiceovers, thumbnails)
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to their own folder
create policy "Users can upload own assets"
  on storage.objects for insert
  with check (
    bucket_id = 'assets' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow public read access to all assets
create policy "Public can read assets"
  on storage.objects for select
  using (bucket_id = 'assets');

-- Allow users to delete own assets
create policy "Users can delete own assets"
  on storage.objects for delete
  using (
    bucket_id = 'assets' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
