-- Migration 005 tried to INSERT pot_id 2 and 3 for the new contract but
-- ON CONFLICT DO NOTHING silently skipped them because rows with those
-- pot_id values already existed (tagged to the old contract).
-- This migration updates those rows directly instead.
UPDATE pots SET
  contract_address = '0x73d690ee60aea5615dfc67d0d179abbdafa3257f',
  name             = 'test again',
  total_allocated  = 6.0
WHERE id = 1;

UPDATE pots SET
  contract_address = '0x73d690ee60aea5615dfc67d0d179abbdafa3257f',
  name             = 'test again',
  total_allocated  = 7.0
WHERE id = 2;
