-- Pots 2 and 3 on the new contract (0x73d690...) were created onchain but
-- never saved to Supabase (contract_address column did not exist yet at the
-- time they were created). Insert them manually so the app shows all 3 pots.
INSERT INTO pots (pot_id, owner, name, total_allocated, tx_hash, chain_id, contract_address)
VALUES
  (2, '0xc28ad0564edf25b517fae206a84063b5a0b2489a', 'test again', 6.0, '0x', 5042002, '0x73d690ee60aea5615dfc67d0d179abbdafa3257f'),
  (3, '0xc28ad0564edf25b517fae206a84063b5a0b2489a', 'test again', 7.0, '0x', 5042002, '0x73d690ee60aea5615dfc67d0d179abbdafa3257f')
ON CONFLICT DO NOTHING;
