/*
# Fix security advisor warnings (re-apply)

1. Set search_path on both SECURITY DEFINER functions to prevent search_path injection
2. Revoke EXECUTE on handle_new_user from anon and authenticated (it's a trigger, not meant to be called directly)

Note: This was previously written as a file but may not have been applied through the MCP tool.
*/

ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
