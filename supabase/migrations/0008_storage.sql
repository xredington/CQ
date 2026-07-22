-- CodeHive · 0008 — storage buckets: member avatars and admin media

-- Avatars: members upload their own, everyone can view. 2MB cap, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Media: event covers, solution logos, spotlight heroes. Admin-managed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

create policy "avatars_read_public" on storage.objects
  for select using (bucket_id = 'avatars');

-- Members write only inside a folder named after their auth uid.
create policy "avatars_insert_own_folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_update_own_folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_delete_own_folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "media_read_public" on storage.objects
  for select using (bucket_id = 'media');

create policy "media_insert_admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());

create policy "media_update_admin" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and public.is_admin());

create policy "media_delete_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());
