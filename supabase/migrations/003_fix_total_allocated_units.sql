-- Fix rows where total_allocated was stored as raw 6-decimal integer
-- instead of human-readable USDC float (e.g. 8000001 → 8.000001).
-- Safe to run multiple times — the WHERE clause only touches rows > 1000
-- which can only be raw integers (no real USDC pot would allocate > $1000
-- as a float from the old code).
UPDATE pots
SET total_allocated = total_allocated / 1000000
WHERE total_allocated > 1000
  AND chain_id = 5042002;
