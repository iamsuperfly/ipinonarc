# DoraHacks / Arc Microgrants — paste this

Official rules want **Arc mainnet**. This repo is on **Arc testnet** by choice until there is mainnet USDC. Flip chain config and redeploy before you submit if you want to be eligible.

## Short description (what it does)

Ipin is a team USDC pot. A crew creates a pot, sets integer shares, pours USDC in, and pays members. The contract refuses to pay the same member twice in the same round.

## How it uses Arc

- Settlement token and gas token are both USDC on Arc.
- Pots, shares, rounds, and the paid-once flag live in a contract on Arc.
- A payout is a real USDC `transfer` on Arc, with an explorer link.
- Instant finality means a paid stamp is final, not "wait twelve blocks."
- Dollar gas is why a $1 crew cut is not eaten by fees.

## Links to fill on DoraHacks

- Live app: *(Vercel URL after you deploy)*
- Repo: https://github.com/iamsuperfly/ipin
- Contract: *(Remix address)* on https://testnet.arcscan.app/address/CONTRACT
- Builder GitHub: https://github.com/iamsuperfly
- Builder X: https://x.com/iamsuperflly

## Checklist vs official rules

| Rule | This build |
|---|---|
| Live deployment they can open | After Vercel |
| Public repo | Yes |
| Description + how it uses Arc | This file + README |
| Public builder profile | GitHub + X above |
| Working on Arc (not a deck) | Yes, on-chain pot |
| Mainnet | Not yet (testnet). Required for the official grant. |
| Not already Circle/Arc funded | Yes |
| One submission per project | Submit Ipin once |
