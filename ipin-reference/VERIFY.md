# Verify Ipin on Arc testnet

Contract: `0x48377ba080A05b85E4966418C46db2C0890f9287`
Explorer: https://testnet.arcscan.app/address/0x48377ba080A05b85E4966418C46db2C0890f9287

Constructor arguments, in order:

1. USDC `0x3600000000000000000000000000000000000000`
2. EURC `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a`

Use the same Remix compiler version and the same optimization toggle you used when you compiled. A mismatch fails even if the source is right.

## Remix, phone or desktop

1. Open the contract page on the explorer.
2. Contract tab, then Verify & publish.
3. Method: Solidity (Single file) if `Ipin.sol` is one file. Solidity (Standard JSON input) if Remix compiled with imports.
4. Compiler: the exact version shown in Remix, including the commit hash.
5. Optimization: match Remix. If you left it off, leave it off. If it was on, use the same run count, usually 200.
6. License: MIT.
7. Paste `contracts/Ipin.sol`. If the form asks for constructor args, paste both addresses in order, no names.
8. Publish. Read contract should then show `usdc` and `eurc`.

Do not verify the old contract `0x7d393aca8d2c55387d304104e50E1eaF14989d7A`.
