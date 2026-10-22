import artifact from '../contracts/out/IPINDistributor.sol/IPINDistributor.json'

// Read from env so you can change contract address in Vercel without touching code.
// VITE_IPIN_CONTRACT_ADDRESS — set in .env and in Vercel environment variables.
export const IPIN_ADDRESS = (
  import.meta.env.VITE_IPIN_CONTRACT_ADDRESS ?? '0x73d690ee60aea5615dfc67d0d179abbdafa3257f'
) as `0x${string}`

// Block the contract was deployed at — used as the starting point for RPC log scans.
// Update this in Vercel env when you redeploy the contract.
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export const IPIN_DEPLOY_BLOCK: bigint = BigInt(String(import.meta.env.VITE_IPIN_DEPLOY_BLOCK ?? '68574971'))

export const IPIN_CONTRACT = {
  address: IPIN_ADDRESS,
  abi: artifact.abi,
} as const

// Arc Testnet chain ID
export const ARC_TESTNET_CHAIN_ID = 5042002

// Arc Testnet USDC address (ERC-20)
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as `0x${string}`

// For mainnet: deploy a new IPINDistributor with the Arc Mainnet USDC address,
// set VITE_IPIN_CONTRACT_ADDRESS and VITE_IPIN_DEPLOY_BLOCK in Vercel to the
// new values, and update ARC_TESTNET_CHAIN_ID to the Arc Mainnet chain ID.
