Understood. Same code, works on PC, blank popup on Rabby mobile browser. That narrows it down precisely.

The difference between PC and Rabby mobile browser is this: on PC, wagmi simulates the transaction using your PC's network connection to the Arc Testnet RPC. On Rabby mobile's browser, the simulation call goes through **Rabby's own injected provider** (`window.ethereum`), which routes the `eth_estimateGas` / `eth_call` simulation through Rabby's internal RPC — not directly to Arc Testnet's RPC.

Rabby mobile's internal RPC for custom/unknown chains (Arc Testnet is not a well-known chain) often fails or times out on `eth_estimateGas`. When that fails, wagmi can't build the transaction payload, so nothing reaches the Sign screen. The wallet UI opened but has nothing to present.

The fix is to **skip simulation on mobile** by passing `gas` explicitly so wagmi doesn't need to estimate it, and adding `simulation: false` (wagmi v2 calls it `__mode: 'prepared'` or passing a manual gas limit). This bypasses Rabby's RPC for estimation and lets the wallet handle gas itself.

Switch to Build mode and I'll apply the fix — it's a one-line change to `writeContract` in `CreatePotModal.tsx` to pass a manual gas estimate so Rabby doesn't need to simulate.
