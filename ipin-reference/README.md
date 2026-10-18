# Ipin

A share is a share. Paid once.

Team USDC pots on **Arc testnet**. Pour money in. Cut the shares. The contract will not pay the same member twice in one round.

**What it does:** a crew opens a pot, sets shares, funds USDC, pays members.
**How it uses Arc:** USDC is gas and settlement. The pot, the paid-once flag, and every payout are Arc transactions with explorer links. Dollar fees are why a small cut stays a small cut.

Copyright © 2026 Superfly. MIT.

Builder: [github.com/iamsuperfly](https://github.com/iamsuperfly) · [x.com/iamsuperflly](https://x.com/iamsuperflly)

Official Arc Microgrants want **mainnet**. This repo stays on testnet until you flip it. See [SUBMISSION.md](SUBMISSION.md) for the DoraHacks paste.

## Network

| | |
|---|---|
| Network | Arc Testnet |
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | https://testnet.arcscan.app |
| USDC (ERC-20, 6 decimals) | `0x3600000000000000000000000000000000000000` |
| Faucet | https://faucet.circle.com |
| Publisher wallet | `0xc28ad0564edf25b517fae206a84063b5a0b2489a` |

Arc drops transactions if `maxFeePerGas` is under **20 gwei**. MetaMask usually sets this. If a deploy hangs with no receipt, raise the max fee.

Anyone can create a pot. The creator owns **that pot only**. Anyone can fund. Only the pot owner can pay.

## Tests

```bash
npm test
```

Payout math + formatting. Solidity tests live in `test/Ipin.t.sol` (`forge test` after `forge install foundry-rs/forge-std`).

## 1. Faucet

1. Open [Circle Faucet](https://faucet.circle.com).
2. Pick **Arc Testnet**.
3. Paste `0xc28ad0564edf25b517fae206a84063b5a0b2489a`.
4. Request USDC.

Add Arc Testnet in MetaMask:

- Network name: Arc Testnet
- RPC: `https://rpc.testnet.arc.network`
- Chain ID: `5042002`
- Symbol: USDC
- Explorer: `https://testnet.arcscan.app`

## 2. Deploy with Remix — computer

1. Open [remix.ethereum.org](https://remix.ethereum.org).
2. New file `Ipin.sol`. Paste [`contracts/Ipin.sol`](contracts/Ipin.sol).
3. Solidity Compiler → `0.8.24` → Enable optimization (200) → Compile.
4. Deploy → Environment **Injected Provider — MetaMask**.
5. Network must be Arc Testnet. Account must be the publisher wallet.
6. Constructor `usdc_`: `0x3600000000000000000000000000000000000000`
7. Deploy → confirm → copy the contract address.

Verify: `https://testnet.arcscan.app/address/<CONTRACT>` → Verify & Publish → 0.8.24, optimizer 200, MIT, paste the same file.

## 2b. Remix on a phone (possible, painful)

Yes, you can. A laptop is easier. Phone path:

1. Install **MetaMask** from the App Store / Play Store. Write the seed on paper. Never type it into Remix or Telegram.
2. In MetaMask: Networks → Add network → Custom. Use the Arc Testnet row above.
3. Switch MetaMask to Arc Testnet. Copy your address. Open the faucet in the same phone browser. Request USDC.
4. Open Safari / Chrome → [remix.ethereum.org](https://remix.ethereum.org). Use the site in the **browser**, not inside the MetaMask in-app browser if Remix looks blank — if it is blank, try the other way (MetaMask browser).
5. File explorer (two sheets icon) → create `Ipin.sol` → paste the contract from GitHub.
6. Solidity compiler icon (S) → 0.8.24 → Compile.
7. Deploy icon (chevron + Ethereum logo) → Environment → **Injected Provider**. MetaMask should pop. Connect.
8. If Remix asks WalletConnect, scan the QR with MetaMask.
9. Constructor field: paste the USDC address above. Hit Deploy. Approve in MetaMask. Wait. Do not leave the screen.
10. Under Deployed Contracts, copy the address (copy icon). Save it in Notes.

If Remix on mobile keeps crashing: use a friend’s laptop for this one step only. The rest of the app is Vercel from your phone just fine.

## 3. Website on Vercel

1. Import this repo.
2. Env: `NEXT_PUBLIC_IPIN_ADDRESS=0xYourDeployedContract`
3. Deploy.
4. Connect → Create pot → Approve → Fund → Cut shares.

Logo: [`public/logo/`](public/logo/).

## Mainnet later

Chain ID `5042`, RPC `https://rpc.mainnet.arc.io`, explorer `https://explorer.arc.io`, same USDC address. Redeploy. Point the env var at the new contract.
