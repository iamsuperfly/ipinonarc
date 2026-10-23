-- Migration 002: add contract_address column to pots table
-- Run this in the Supabase SQL Editor once.
-- Existing rows will have contract_address = NULL which is fine —
-- they belong to the old contract and will no longer appear in queries
-- that filter by the current contract address.

ALTER TABLE pots
  ADD COLUMN IF NOT EXISTS contract_address text;

-- Index for fast lookup by contract address
CREATE INDEX IF NOT EXISTS pots_contract_address_idx ON pots (contract_address);
