-- Restrict direct client execution of internal project helper functions.
-- Public application RPCs retain execution through their SECURITY DEFINER owner.
revoke execute on function mizan_private.can_access_project(uuid) from authenticated;
revoke execute on function mizan_private.is_active_org_member(uuid) from authenticated;
