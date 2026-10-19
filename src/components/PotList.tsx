import { useEffect, useState } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { Loader2, RefreshCw } from 'lucide-react'
import { parseAbiItem } from 'viem'
import { IPIN_CONTRACT, IPIN_ADDRESS, ARC_TESTNET_CHAIN_ID } from '../contract'
import PotCard from './PotCard'

interface Props {
  refreshKey: number
  onRefresh: () => void
}

const POT_CREATED_EVENT = parseAbiItem(
  'event PotCreated(uint256 indexed potId, address indexed owner, string name, uint256 totalAllocated)'
)

export default function PotList({ refreshKey, onRefresh }: Props) {
  const { address } = useAccount()
  const client = usePublicClient({ chainId: ARC_TESTNET_CHAIN_ID })
  const [potIds, setPotIds] = useState<bigint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!address || !client) { setLoading(false); return }

    // Only show spinner on the very first load, not on every refresh
    setPotIds(prev => { if (prev.length === 0) setLoading(true); return prev })

    void (async () => {
      try {
        // Get current block and scan back up to 500k blocks (covers all testnet history cheaply)
        const head = await client.getBlockNumber()
        const fromBlock = head > 500_000n ? head - 500_000n : 0n
        const logs = await client.getLogs({
          address: IPIN_ADDRESS,
          event: POT_CREATED_EVENT,
          args: { owner: address },
          fromBlock,
          toBlock: 'latest',
        })
        // Newest first
        const ids = logs
          .map(l => (l.args as { potId: bigint }).potId)
          .filter(Boolean)
          .reverse()
        setPotIds(ids)
      } catch {
        // Keep existing ids on error so screen doesn't blank out
      } finally {
        setLoading(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, client, refreshKey])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin" style={{ color: 'var(--color-mute)' }} />
      </div>
    )
  }

  if (potIds.length === 0) {
    return (
      <div
        className="rise-in rounded-3xl border p-10 text-center"
        style={{ borderColor: 'rgba(27,24,19,0.10)', background: 'var(--color-panel)' }}
      >
        <p className="text-4xl font-bold" style={{ color: 'var(--color-laterite)' }}>IP</p>
        <h3 className="mt-4 text-xl font-bold">No pots yet</h3>
        <p className="mx-auto mt-2 max-w-xs text-sm" style={{ color: 'var(--color-mute)' }}>
          Create a pot, fund it with USDC, and pay all recipients in one transaction.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--color-mute)' }}>
          {potIds.length} {potIds.length === 1 ? 'pot' : 'pots'}
        </p>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 text-xs"
          style={{ color: 'var(--color-mute)' }}
        >
          <RefreshCw className="size-3.5" />
          Refresh
        </button>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {potIds.map(id => (
          <PotCard
            key={id.toString()}
            potId={id}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </div>
  )
}

// Re-export contract ref so PotCard can still import from contract.ts
export { IPIN_CONTRACT }
