-- Restrict direct authenticated mutation of evidence records.
-- Evidence creation remains available to the validated upload flow; edits and deletes are server-controlled.
revoke update, delete on table public.meter_evidence from authenticated;

comment on table public.meter_evidence is
  'Authenticated clients may create evidence records through the validated upload flow; direct update and delete are revoked.';
