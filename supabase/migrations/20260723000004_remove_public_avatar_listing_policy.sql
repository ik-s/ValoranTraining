-- A public bucket serves object URLs without a broad storage.objects SELECT
-- policy. Removing this policy prevents anonymous object listing.

drop policy if exists "profile avatars are publicly readable" on storage.objects;
