-- Supabase grants EXECUTE directly to API roles for newly-created functions.
-- Keep this trigger helper inaccessible through the RPC API.
revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;
