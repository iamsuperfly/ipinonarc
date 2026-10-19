import artifact from '../contracts/out/IPINDistributor.sol/IPINDistributor.json'

// Read from env so you can change contract address in Vercel without touching code.
// VITE_IPIN_CONTRACT_ADDRESS — set in .env and in Vercel environment variables.
export const IPIN_ADDRESS = (
  import.meta.env.VITE_IPIN_CONTRACT_ADDRESS ?? '0x57ccd9d1fe3dd6bea51c591e4f447c96ca985f1b'
) as `0x${string}`

// Block the contract was deployed at — used as the starting point for RPC log scans.
// Update this in Vercel env when you redeploy the contract.
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export const IPIN_DEPLOY_BLOCK: bigint = BigInt(String(import.meta.env.VITE_IPIN_DEPLOY_BLOCK ?? '67386375'))

export const IPIN_CONTRACT = {
  address: IPIN_ADDRESS,
  abi: artifact.abi,
} as const

// Arc Testnet chain ID
export const ARC_TESTNET_CHAIN_ID = 5042002

// For mainnet: deploy a new IPINDistributor with the Arc Mainnet USDC address,
// set VITE_IPIN_CONTRACT_ADDRESS and VITE_IPIN_DEPLOY_BLOCK in Vercel to the
// new values, and update ARC_TESTNET_CHAIN_ID to the Arc Mainnet chain ID.
