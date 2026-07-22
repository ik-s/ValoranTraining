-- First-login profile completion and owner-scoped avatar storage.

alter table public.profiles
  add column avatar_url text,
  add column profile_completed boolean not null default false,
  add column updated_at timestamptz not null default now(),
  add constraint profiles_avatar_url_https
    check (avatar_url is null or avatar_url like 'https://%');

grant update (display_name, avatar_url, profile_completed, updated_at)
  on table public.profiles to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "users insert avatars in their own folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "users update avatars in their own folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "users delete avatars in their own folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
