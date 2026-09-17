-- Restrict direct client writes to server-generated billing and audit records.
-- Authenticated users retain read access; SECURITY DEFINER billing functions
-- execute as the postgres-owned function owner.
revoke insert, update, delete on table
  public.audit_events,
  public.consumptions,
  public.invoices,
  public.receivables
from authenticated;

grant select on table
  public.audit_events,
  public.consumptions,
  public.invoices,
  public.receivables
to authenticated;
