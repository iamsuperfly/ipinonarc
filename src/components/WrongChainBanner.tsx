import { useAccount, useSwitchChain } from 'wagmi'
import { arcTestnet } from 'viem/chains'
import { ARC_TESTNET_CHAIN_ID } from '../contract'

export default function WrongChainBanner() {
  const { isConnected, chainId } = useAccount()
  const { switchChain, isPending } = useSwitchChain()

  if (!isConnected || chainId === ARC_TESTNET_CHAIN_ID) return null

  const addAndSwitch = () => {
    switchChain({
      chainId: ARC_TESTNET_CHAIN_ID,
      // viem/chains arcTestnet has the addEthereumChain params wagmi needs
      ...(arcTestnet as object),
    })
  }

  return (
    <div
      className="sticky top-16 z-30 flex items-center justify-between gap-3 px-4 py-3 text-sm sm:px-6"
      style={{ background: 'rgba(0,122,102,0.08)', borderBottom: '1px solid rgba(0,122,102,0.20)' }}
    >
      <span style={{ color: 'var(--color-laterite)' }}>
        IPIN runs on <strong>Arc Testnet</strong>. Switch your wallet to continue.
      </span>
      <button
        onClick={addAndSwitch}
        disabled={isPending}
        className="btn-primary shrink-0 h-9 px-4 text-xs"
      >
        {isPending ? 'Switching…' : 'Switch to Arc'}
      </button>
    </div>
  )
}
