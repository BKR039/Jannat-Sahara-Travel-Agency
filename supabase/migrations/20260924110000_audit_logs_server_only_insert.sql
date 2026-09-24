-- =========================================================================
-- Security Batch 4 — SEC-11: Audit Log Immutability & Server-Only Authority
-- =========================================================================
-- Revokes direct INSERT on public.audit_logs from the authenticated role.
-- Ensures that client-side authenticated browsers cannot forge audit records.
-- All legitimate audit events remain strictly authoritative and are recorded
-- solely by server functions using the service-role client.
--
-- Direct UPDATE and DELETE are already permanently denied (no grants or policies).
-- =========================================================================

REVOKE INSERT ON public.audit_logs FROM authenticated;
DROP POLICY IF EXISTS audit_logs_admin_insert ON public.audit_logs;
