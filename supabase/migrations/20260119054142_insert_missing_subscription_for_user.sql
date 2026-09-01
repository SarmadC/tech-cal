-- Historical one-off production data repair.
--
-- The original migration contained account-specific billing data and was
-- already applied directly to production. Its statement is intentionally
-- omitted from source control while this no-op preserves migration-history
-- parity for local development and future deployments.
select 1;
