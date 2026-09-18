-- has_permission is an internal authorization helper.
-- It must not be directly callable by API roles; trusted SECURITY DEFINER
-- domain functions invoke it using their owner privileges.
revoke execute on function mizan_private.has_permission(text, uuid, uuid) from public, anon, authenticated;
grant execute on function mizan_private.has_permission(text, uuid, uuid) to service_role;
