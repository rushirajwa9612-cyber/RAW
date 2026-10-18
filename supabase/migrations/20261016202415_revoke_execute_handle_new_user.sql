/*
# Properly revoke EXECUTE on handle_new_user trigger function

The previous REVOKE from anon, authenticated didn't work because the function
was granted to PUBLIC (which all roles inherit). We need to revoke from PUBLIC
and then the trigger still works because it runs as the function's SECURITY DEFINER owner.

1. Revoke EXECUTE from PUBLIC (covers all roles including anon and authenticated)
2. The trigger on auth.users still works because triggers run with the function's owner privileges
3. search_path was already set in a previous migration
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
