import artifact from '../contracts/out/IPINDistributor.sol/IPINDistributor.json'

// Read from env so you can change contract address in Vercel without touching code.
// VITE_IPIN_CONTRACT_ADDRESS — set in .env and in Vercel environment variables.
export const IPIN_ADDRESS = (
  import.meta.env.VITE_IPIN_CONTRACT_ADDRESS ?? '0xA2b6E06f57AD38f045A62a04b406953dD9575D94'
) as `0x${string}`

// Block the contract was deployed at — used as the starting point for RPC log scans.
// Update this in Vercel env when you redeploy the contract.
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export const IPIN_DEPLOY_BLOCK: bigint = BigInt(String(import.meta.env.VITE_IPIN_DEPLOY_BLOCK ?? '27512282'))

export const IPIN_CONTRACT = {
  address: IPIN_ADDRESS,
  abi: artifact.abi,
} as const

// Arc Mainnet chain ID
export const ARC_TESTNET_CHAIN_ID = 5042

// Arc Mainnet USDC address (ERC-20) — same predeploy address on mainnet and testnet
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as `0x${string}`
