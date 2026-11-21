/**
 * Wallet detection helpers.
 *
 * IPIN only ships an injected connector, so a visitor with no wallet
 * extension installed gets no feedback at all when they click
 * "Connect wallet" — the call silently does nothing. Check for an
 * injected provider first and tell the user what to do instead.
 */
export function hasInjectedWallet(): boolean {
  if (typeof window === 'undefined') return false
  const eth = (window as unknown as { ethereum?: unknown }).ethereum
  return Boolean(eth)
}
