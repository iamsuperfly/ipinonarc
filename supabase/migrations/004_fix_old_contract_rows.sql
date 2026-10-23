-- Rows inserted before the new contract was deployed (Oct 22 2026) were
-- backfilled with the new contract address by mistake. Move them back to
-- the old contract address so they are excluded from the new contract filter.
UPDATE pots
SET contract_address = '0x57ccd9d1fe3dd6bea51c591e4f447c96ca985f1b'
WHERE contract_address = '0x73d690ee60aea5615dfc67d0d179abbdafa3257f'
  AND created_at < '2026-10-22 00:00:00+00';
