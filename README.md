# IPIN

IPIN is a USDC distribution layer built on Arc. Create a pot, add recipients with custom or equal splits, fund it with USDC, and pay everyone in one transaction.

## How it works

1. **Create** — give the pot a name, add recipient addresses, set equal or custom USDC amounts
2. **Fund** — deposit USDC into the pot (approve + deposit, two steps)
3. **Pay All** — sends every recipient their allocated USDC in one transaction
4. **Withdraw** — pull any remaining balance after the pot is closed

## Stack

- **Smart contract** — Solidity on Arc Testnet, audited, no fees
- **Frontend** — React + Vite + wagmi v2
- **Storage** — Supabase (pot index per wallet, cross-device)
- **Chain** — Arc Testnet (USDC as native gas)

## Environment variables

Create a `.env` file (never commit it):

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_IPIN_CONTRACT_ADDRESS=0x57ccd9d1fe3dd6bea51c591e4f447c96ca985f1b
VITE_IPIN_DEPLOY_BLOCK=67386375
```

For Vercel, add these same variables in **Project Settings → Environment Variables**.

## Supabase setup

Run the migration in `supabase/migrations/001_create_pots.sql` in your Supabase SQL editor.

## Dev

```bash
bun install
bun run dev
```

## Deploy

```bash
bun run build
```

Configured for Vercel via `vercel.json`.

## Contract

`contracts/IPINDistributor.sol` — deploy a new instance for mainnet and update `VITE_IPIN_CONTRACT_ADDRESS` and `VITE_IPIN_DEPLOY_BLOCK` in your environment variables.

## License

MIT
