-- Security fix: prevent users from granting themselves admin.
-- The RLS "update own profile" policy allowed a user to edit their own row,
-- and the table-level UPDATE grant let that include the is_admin column. Remove
-- the blanket update grant and re-grant update on account_name only, so is_admin
-- can only be changed with the service role.
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (account_name) ON public.profiles TO anon, authenticated;
