# IPIN — USDC Distribution Layer

> Built with Arc Studio - money-powered apps in minutes

IPIN is a distribution layer for USDC on Arc. An owner creates a "pot" with a name, recipient addresses and allocations, funds it with USDC, and pays everyone in one atomic transaction.

---

## Contract Deployments

### IPINDistributor

| Chain | Address | Explorer | Deploy Block |
|-------|---------|---------|-------------|
| **Arc Mainnet (v2, with fees)** | `0xA2b6E06f57AD38f045A62a04b406953dD9575D94` | [ArcScan](https://arc.etherscan.io/address/0xA2b6E06f57AD38f045A62a04b406953dD9575D94) | 27512282 |
| Arc Testnet (v2, with fees) | `0x73d690ee60aea5615dfc67d0d179abbdafa3257f` | [ArcScan](https://explorer.testnet.arc.io/address/0x73d690ee60aea5615dfc67d0d179abbdafa3257f) | 68574971 |
| Arc Testnet (v1, no fees) | `0x57ccd9d1fe3dd6bea51c591e4f447c96ca985f1b` | [ArcScan](https://explorer.testnet.arc.io/address/0x57ccd9d1fe3dd6bea51c591e4f447c96ca985f1b) | 67386375 |

**Constructor args (v2):** `(_usdc, _owner, _feeRecipient)`
- USDC: `0x3600000000000000000000000000000000000000` (same on mainnet and testnet)
- Owner: `0xc28ad0564edf25b517fae206a84063b5a0b2489a`
- FeeRecipient: `0xc28ad0564edf25b517fae206a84063b5a0b2489a`

**Fee:** 0.25% on `fund()`, capped at 20 USDC. Fee charged on top of funded amount.

---

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS, Arc Light theme
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry + OpenZeppelin 5.1.0. Sources in `contracts/`, build: `bun run contracts:build`, test: `bun run contracts:test`
- Chain: Arc Testnet (Chain ID: 5042002)
- Token: USDC (6 decimals, `0x3600000000000000000000000000000000000000`)

## Key Files

- `src/App.tsx` — thin composition root
- `src/contract.ts` — contract address + ABI import
- `src/utils.ts` — formatAddress, formatUsdc, parseOnchainError
- `src/components/Header.tsx` — sticky header + wallet connect
- `src/components/PotList.tsx` — reads potCount, renders PotCards
- `src/components/PotCard.tsx` — per-pot state, Pay All, Close Pot actions
- `src/components/CreatePotModal.tsx` — create a new pot (equal or custom split)
- `src/components/FundSheet.tsx` — fund a pot (approve + deposit)
- `src/components/WithdrawSheet.tsx` — withdraw residual after close
- `contracts/IPINDistributor.sol` — main contract

## Contract Functions

| Function | Who | When |
|----------|-----|------|
| `createPot(name, recipients[], amounts[])` | anyone | create a new pot |
| `fund(potId, amount)` | owner | deposit USDC (approve first) |
| `payAll(potId)` | owner | atomic pay-everyone or revert |
| `payBestEffort(potId)` | owner | best-effort pay, skip failures |
| `payRange(potId, start, end)` | owner | chunked payout for large pots |
| `closePot(potId)` | owner | seal the pot before withdrawing |
| `withdraw(potId, to)` | owner | withdraw residual after close |
| `retryFailed(potId)` | owner | retry failed recipients |
| `retryFailedRange(potId, start, end)` | owner | retry in range |
| `getPot(potId)` | anyone | read pot state |
| `getRecipients(potId)` | anyone | read recipient list + paid status |
