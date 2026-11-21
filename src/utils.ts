export function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// Protocol fee: 0.25% (25 bps) capped at 20 USDC — mirrors
// IPINDistributor.FEE_BPS / FEE_CAP in contracts/IPINDistributor.sol.
// Used for fee previews only; the Fund flow still reads the exact
// fee from the contract via calculateFee.
export const FEE_BPS = 25n
export const FEE_CAP_USDC = 20_000_000n // 20 USDC, 6 decimals

export function calculateFee(amount: bigint): bigint {
  const fee = (amount * FEE_BPS) / 10_000n
  return fee > FEE_CAP_USDC ? FEE_CAP_USDC : fee
}

export function formatUsdc(raw: bigint, decimals = 6): string {
  const n = Number(raw) / 10 ** decimals
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function parseOnchainError(error: unknown): string {
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? ''
  if (msg.includes('user rejected') || msg.includes('user denied')) return 'Transaction cancelled.'
  if (msg.includes('insufficient funds') || msg.includes('exceeds balance')) return 'Insufficient USDC balance.'
  if (msg.includes('insufficientfunds')) return 'Pot not fully funded yet.'
  if (msg.includes('potclosed')) return 'This pot is already closed.'
  if (msg.includes('potnotclosed')) return 'Close the pot first before withdrawing.'
  if (msg.includes('unauthorized')) return 'Only the pot owner can do this.'
  if (msg.includes('nothingtowithdraw')) return 'No remaining balance to withdraw.'
  if (msg.includes('reverted')) {
    const match = msg.match(/reason="([^"]+)"/)
    return match ? `Failed: ${match[1]}` : 'Transaction reverted.'
  }
  if (msg.includes('network') || msg.includes('timeout')) return 'Network error — please retry.'
  return 'Something went wrong. Please try again.'
}
