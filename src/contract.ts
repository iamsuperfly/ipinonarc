import artifact from '../contracts/out/IPINDistributor.sol/IPINDistributor.json'

export const IPIN_ADDRESS = '0x57ccd9d1fe3dd6bea51c591e4f447c96ca985f1b' as const

export const IPIN_CONTRACT = {
  address: IPIN_ADDRESS,
  abi: artifact.abi,
} as const

// Arc Testnet chain ID
export const ARC_TESTNET_CHAIN_ID = 5042002

// For mainnet: deploy a new IPINDistributor with the Arc Mainnet USDC address,
// then update IPIN_ADDRESS above and set ARC_CHAIN_ID to the Arc Mainnet chain ID.
