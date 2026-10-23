# 💸 IPIN — USDC Distribution on Arc

### One pot. Many people. One transaction.

**A USDC bulk-distribution protocol built on Arc.** Create a named pot, add recipients with custom allocations, deposit USDC, and pay everyone at once — in a single onchain transaction. No batching, no spreadsheets, no manual transfers.

[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=flat-square&logo=solidity)](https://soliditylang.org/)
[![Arc Mainnet](https://img.shields.io/badge/Arc-Mainnet-007a66?style=flat-square)](https://arc.io)
[![USDC](https://img.shields.io/badge/USDC-Native_Gas-2775CA?style=flat-square)](https://www.circle.com/usdc)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

**Verified contract · 0.25% fee (capped at 20 USDC) · Supabase-indexed · Mobile-ready**

Built for the **Circle Arc Hackathon**

### ▶ [Live app](https://ipinonarc.vercel.app) · [Contract on Arc Explorer](https://arc.etherscan.io/address/0xA2b6E06f57AD38f045A62a04b406953dD9575D94) · [Built with Arc Studio](https://studio.arc.io)

---

## Table of contents

- [The 60-second pitch](#-the-60-second-pitch)
- [How it works](#-how-it-works)
- [Why Arc](#-why-arc)
- [Contract](#-contract)
- [Fee model](#-fee-model)
- [Tech stack](#-tech-stack)
- [Quick start](#-quick-start)
- [Environment variables](#-environment-variables)
- [Supabase setup](#-supabase-setup)
- [Deploying your own contract](#-deploying-your-own-contract)
- [Hackathon alignment](#-hackathon-alignment)

---

## ⚡ The 60-second pitch

Paying multiple people USDC today means N separate transactions — N wallet pops, N gas fees, N chances to miss someone. For a company paying contractors, a DAO distributing grants, or a creator splitting revenue with collaborators, that's hours of manual work every cycle.

IPIN turns it into four steps:

1. **Create a pot** — name it, add recipient addresses, set how much each person gets
2. **Fund it** — deposit USDC in one approve + transfer
3. **Pay** — one transaction sends every recipient their exact allocation simultaneously
4. **Done** — pot closes automatically, any residual is withdrawable

Arc makes this practical: USDC is the gas token, so recipients only need one asset and fees are predictable cents, not volatile ETH.

---

## 🔄 How it works

| Step | What happens | Onchain? |
|---|---|---|
| **Create** | Name the pot, add addresses, set allocations | Yes — `createPot` |
| **Approve** | Authorize the contract to pull USDC (amount + fee) | Yes — ERC-20 `approve` |
| **Fund** | USDC enters the pot; 0.25% fee sent to protocol | Yes — `fund` |
| **Pay** | Every recipient receives their allocation atomically | Yes — `payAll` |
| **Withdraw** | Owner reclaims any unfunded or failed-transfer residual | Yes — `withdraw` |

If a recipient address fails (e.g. blocklisted by Circle), **Pay anyway** calls `payBestEffort` — skips failures, pays everyone else, residual stays withdrawable.

---

## 🔵 Why Arc

- **USDC as native gas** — users hold one asset, not two. No ETH required to pay gas.
- **Stable, predictable fees** — transaction costs are denominated in USDC, not volatile ETH.
- **Sub-second finality** — the entire pay loop confirms in under a second regardless of recipient count.
- **Same EVM tooling** — Foundry, wagmi, viem, Etherscan all work without modification.

---

## 📄 Contract

| | |
|---|---|
| **Address** | `0xA2b6E06f57AD38f045A62a04b406953dD9575D94` |
| **Chain** | Arc Mainnet (chain ID 5042) |
| **Verified** | [arc.etherscan.io](https://arc.etherscan.io/address/0xA2b6E06f57AD38f045A62a04b406953dD9575D94#code) — Exact Match |
| **Deploy block** | 27,512,282 |
| **Source** | `contracts/IPINDistributor.sol` |
| **Audited** | Yes — rule corpus + functional review, max severity |

---

## 💰 Fee model

| Pot amount | Fee | Total charged |
|---|---|---|
| 100 USDC | 0.25 USDC | 100.25 USDC |
| 1,000 USDC | 2.50 USDC | 1,002.50 USDC |
| 8,000 USDC | 20.00 USDC (cap) | 8,020 USDC |
| 100,000 USDC | 20.00 USDC (cap) | 100,020 USDC |

- Fee rate: **0.25%** hardcoded, not changeable
- Fee cap: **20 USDC** — large pots never pay more
- Fee recipient: owner-updatable via `setFeeRecipient`
- Recipients always receive their **full allocated amount** — fee is charged on top

---

## 🛠 Tech stack

- **Smart contract** — Solidity 0.8.20, OpenZeppelin SafeERC20 + ReentrancyGuard, deployed on Arc Mainnet
- **Frontend** — React 19 + Vite + TypeScript + Tailwind CSS
- **Onchain** — wagmi v2 + viem, `injected()` provider (MetaMask, Rabby, any EIP-1193 wallet)
- **Routing** — React Router v6 (`/`, `/pots`, `/profile`)
- **Storage** — Supabase (pot index per wallet + contract address, cross-device)
- **Deploy** — Vercel

---

## 🏃 Quick start

```bash
git clone https://github.com/iamsuperfly/ipinonarc.git
cd ipinonarc
bun install
bun run dev
```

Open `http://localhost:5173`.

---

## 🔑 Environment variables

Create a `.env` file (never commit it):

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_IPIN_CONTRACT_ADDRESS=0xA2b6E06f57AD38f045A62a04b406953dD9575D94
VITE_IPIN_DEPLOY_BLOCK=27512282
```

For Vercel: **Project Settings → Environment Variables**, add all four.

---

## 🗄 Supabase setup

Run migrations in order in the Supabase SQL editor:

```
supabase/migrations/001_create_pots.sql
supabase/migrations/002_add_contract_address.sql
```

---

## 🚀 Deploying your own contract

The contract constructor takes three arguments:

```
_usdc:          0x3600000000000000000000000000000000000000  (Arc USDC, same on mainnet + testnet)
_owner:         your wallet address
_feeRecipient:  wallet to receive protocol fees
```

In Remix: paste `contracts/IPINDistributor.sol`, compile with Solidity `0.8.20` + `paris` EVM target, deploy via Injected Provider on Arc Mainnet (chain ID 5042, RPC `https://rpc.mainnet.arc.io`). Then update `VITE_IPIN_CONTRACT_ADDRESS` and `VITE_IPIN_DEPLOY_BLOCK` in your environment.

---

## 🏆 Hackathon alignment

| Requirement | Status |
|---|---|
| Deployed on Arc Mainnet | ✅ `0xA2b6E06f...` — verified, live |
| USDC as the payment asset | ✅ Only USDC, enforced in constructor |
| Real distribution executed | ✅ First pot created, funded, paid, closed on mainnet |
| Arc-native gas (USDC only) | ✅ No ETH required for any operation |
| Smart contract security | ✅ Dual audit (rule corpus + functional), Slither, 79/79 unit tests |
| Frontend on Arc | ✅ Live at ipinonarc.vercel.app |

---

## 📄 License

MIT — Built with [Arc Studio](https://studio.arc.io)
