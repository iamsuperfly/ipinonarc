// Read from env so you can change contract address in Vercel without touching code.
// VITE_IPIN_CONTRACT_ADDRESS — set in .env and in Vercel environment variables.
export const IPIN_ADDRESS = (
  import.meta.env.VITE_IPIN_CONTRACT_ADDRESS ?? '0xA2b6E06f57AD38f045A62a04b406953dD9575D94'
) as `0x${string}`

// Block the contract was deployed at — used as the starting point for RPC log scans.
export const IPIN_DEPLOY_BLOCK: bigint = BigInt(String(import.meta.env.VITE_IPIN_DEPLOY_BLOCK ?? '27512282'))

// Arc Mainnet chain ID
export const ARC_CHAIN_ID = 5042

// Arc Mainnet USDC address (ERC-20) — same predeploy address on mainnet and testnet
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as `0x${string}`

// ABI inlined to avoid dependency on contracts/out/ build artifacts
export const IPIN_ABI = [
  { type: 'constructor', inputs: [{ name: '_usdc', type: 'address', internalType: 'address' }, { name: '_owner', type: 'address', internalType: 'address' }, { name: '_feeRecipient', type: 'address', internalType: 'address' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'FEE_BPS', inputs: [], outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'FEE_BPS_DENOMINATOR', inputs: [], outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'FEE_CAP', inputs: [], outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'calculateFee', inputs: [{ name: 'amount', type: 'uint256', internalType: 'uint256' }], outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }], stateMutability: 'pure' },
  { type: 'function', name: 'closePot', inputs: [{ name: 'potId', type: 'uint256', internalType: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'createPot', inputs: [{ name: 'name', type: 'string', internalType: 'string' }, { name: 'recipients', type: 'address[]', internalType: 'address[]' }, { name: 'amounts', type: 'uint256[]', internalType: 'uint256[]' }], outputs: [{ name: 'potId', type: 'uint256', internalType: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'feeRecipient', inputs: [], outputs: [{ name: '', type: 'address', internalType: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'fund', inputs: [{ name: 'potId', type: 'uint256', internalType: 'uint256' }, { name: 'amount', type: 'uint256', internalType: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'getPot', inputs: [{ name: 'potId', type: 'uint256', internalType: 'uint256' }], outputs: [{ name: 'name', type: 'string', internalType: 'string' }, { name: 'potOwner', type: 'address', internalType: 'address' }, { name: 'totalAllocated', type: 'uint256', internalType: 'uint256' }, { name: 'fundedAmount', type: 'uint256', internalType: 'uint256' }, { name: 'paidOut', type: 'uint256', internalType: 'uint256' }, { name: 'closed', type: 'bool', internalType: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'getRecipients', inputs: [{ name: 'potId', type: 'uint256', internalType: 'uint256' }], outputs: [{ name: '', type: 'tuple[]', internalType: 'struct IPINDistributor.Recipient[]', components: [{ name: 'addr', type: 'address', internalType: 'address' }, { name: 'amount', type: 'uint256', internalType: 'uint256' }, { name: 'paid', type: 'bool', internalType: 'bool' }, { name: 'failed', type: 'bool', internalType: 'bool' }] }], stateMutability: 'view' },
  { type: 'function', name: 'owner', inputs: [], outputs: [{ name: '', type: 'address', internalType: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'payAll', inputs: [{ name: 'potId', type: 'uint256', internalType: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'payBestEffort', inputs: [{ name: 'potId', type: 'uint256', internalType: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'payRange', inputs: [{ name: 'potId', type: 'uint256', internalType: 'uint256' }, { name: 'start', type: 'uint256', internalType: 'uint256' }, { name: 'end', type: 'uint256', internalType: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'potCount', inputs: [], outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'retryFailed', inputs: [{ name: 'potId', type: 'uint256', internalType: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'retryFailedRange', inputs: [{ name: 'potId', type: 'uint256', internalType: 'uint256' }, { name: 'start', type: 'uint256', internalType: 'uint256' }, { name: 'end', type: 'uint256', internalType: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'setFeeRecipient', inputs: [{ name: 'newRecipient', type: 'address', internalType: 'address' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'transferOwnership', inputs: [{ name: 'newOwner', type: 'address', internalType: 'address' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'usdc', inputs: [], outputs: [{ name: '', type: 'address', internalType: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'withdraw', inputs: [{ name: 'potId', type: 'uint256', internalType: 'uint256' }, { name: 'to', type: 'address', internalType: 'address' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'event', name: 'FeeCharged', inputs: [{ name: 'potId', type: 'uint256', indexed: true, internalType: 'uint256' }, { name: 'fee', type: 'uint256', indexed: false, internalType: 'uint256' }], anonymous: false },
  { type: 'event', name: 'FeeRecipientUpdated', inputs: [{ name: 'previous', type: 'address', indexed: true, internalType: 'address' }, { name: 'next', type: 'address', indexed: true, internalType: 'address' }], anonymous: false },
  { type: 'event', name: 'OwnershipTransferred', inputs: [{ name: 'previousOwner', type: 'address', indexed: true, internalType: 'address' }, { name: 'newOwner', type: 'address', indexed: true, internalType: 'address' }], anonymous: false },
  { type: 'event', name: 'PotCreated', inputs: [{ name: 'potId', type: 'uint256', indexed: true, internalType: 'uint256' }, { name: 'owner', type: 'address', indexed: true, internalType: 'address' }, { name: 'name', type: 'string', indexed: false, internalType: 'string' }, { name: 'totalAllocated', type: 'uint256', indexed: false, internalType: 'uint256' }], anonymous: false },
  { type: 'event', name: 'PotFunded', inputs: [{ name: 'potId', type: 'uint256', indexed: true, internalType: 'uint256' }, { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' }, { name: 'totalFunded', type: 'uint256', indexed: false, internalType: 'uint256' }], anonymous: false },
  { type: 'event', name: 'PotPaid', inputs: [{ name: 'potId', type: 'uint256', indexed: true, internalType: 'uint256' }, { name: 'paidOut', type: 'uint256', indexed: false, internalType: 'uint256' }], anonymous: false },
  { type: 'event', name: 'PotSealed', inputs: [{ name: 'potId', type: 'uint256', indexed: true, internalType: 'uint256' }], anonymous: false },
  { type: 'event', name: 'PotWithdrawn', inputs: [{ name: 'potId', type: 'uint256', indexed: true, internalType: 'uint256' }, { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' }], anonymous: false },
  { type: 'event', name: 'RecipientRetried', inputs: [{ name: 'potId', type: 'uint256', indexed: true, internalType: 'uint256' }, { name: 'recipient', type: 'address', indexed: true, internalType: 'address' }, { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' }], anonymous: false },
  { type: 'error', name: 'ArrayLengthMismatch', inputs: [] },
  { type: 'error', name: 'EmptyRecipients', inputs: [] },
  { type: 'error', name: 'InsufficientFunds', inputs: [] },
  { type: 'error', name: 'InvalidPotId', inputs: [] },
  { type: 'error', name: 'InvalidRange', inputs: [] },
  { type: 'error', name: 'InvalidToken', inputs: [] },
  { type: 'error', name: 'NothingToWithdraw', inputs: [] },
  { type: 'error', name: 'PotClosed', inputs: [] },
  { type: 'error', name: 'PotNotClosed', inputs: [] },
  { type: 'error', name: 'Unauthorized', inputs: [] },
  { type: 'error', name: 'ZeroAddress', inputs: [] },
  { type: 'error', name: 'ZeroAmount', inputs: [] },
] as const

export const IPIN_CONTRACT = {
  address: IPIN_ADDRESS,
  abi: IPIN_ABI,
} as const
