-- The initial schema migration predates this hardening. Keep the trigger
-- function executable only by the database, never by API roles.
revoke all on function public.create_profile_for_new_user() from public;
revoke all on function public.create_profile_for_new_user() from anon, authenticated;
