# IPIN — USDC Distribution Layer

> Built with Arc Studio - money-powered apps in minutes

IPIN is a distribution layer for USDC on Arc. An owner creates a "pot" with a name, recipient addresses and allocations, funds it with USDC, and pays everyone in one atomic transaction.

---

## Contract Deployments

### IPINDistributor

| Chain | Address | Explorer |
|-------|---------|---------|
| Arc Testnet | `0x57ccd9d1fe3dd6bea51c591e4f447c96ca985f1b` | [ArcScan](https://explorer.testnet.arc.io/address/0x57ccd9d1fe3dd6bea51c591e4f447c96ca985f1b) |

**Constructor arg:** USDC address (`0x3600000000000000000000000000000000000000` on Arc Testnet)

**For Arc Mainnet:** deploy a new `IPINDistributor` with the Arc Mainnet USDC address, then update `src/contract.ts` with the new address and chain ID.

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
