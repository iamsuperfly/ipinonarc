import { useEffect, useState } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { Loader2, RefreshCw } from 'lucide-react'
import { parseAbiItem } from 'viem'
import { IPIN_ADDRESS, IPIN_DEPLOY_BLOCK, ARC_TESTNET_CHAIN_ID } from '../contract'
import { fetchPots } from '../supabase'
import PotCard from './PotCard'

interface Props {
  refreshKey: number
  onRefresh: () => void
  onCreatePot: () => void
}

const POT_CREATED_EVENT = parseAbiItem(
  'event PotCreated(uint256 indexed potId, address indexed owner, string name, uint256 totalAllocated)'
)

export default function PotList({ refreshKey, onRefresh, onCreatePot }: Props) {
  const { address } = useAccount()
  const client = usePublicClient({ chainId: ARC_TESTNET_CHAIN_ID })
  const [potIds, setPotIds] = useState<bigint[]>([])
  const [createdAtMap, setCreatedAtMap] = useState<Record<string, string>>({})
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!address) { setInitialLoading(false); return }

    // Only show full-page spinner on the very first load
    const isFirstLoad = potIds.length === 0
    if (isFirstLoad) setInitialLoading(true)
    else setRefreshing(true)

    void (async () => {
      try {
        // Primary: Supabase — instant, no RPC, cross-device
        const rows = await fetchPots(address, ARC_TESTNET_CHAIN_ID, IPIN_ADDRESS)

        if (rows.length > 0) {
          setPotIds(rows.map(r => BigInt(r.pot_id)))
          const map: Record<string, string> = {}
          for (const r of rows) map[String(r.pot_id)] = r.created_at
          setCreatedAtMap(map)
          return
        }

        // Fallback: scan RPC logs in 9999-block batches
        if (!client) return

        const head = await client.getBlockNumber()
        const BATCH = 9999n
        const allIds: bigint[] = []

        for (let from = IPIN_DEPLOY_BLOCK; from <= head; from += BATCH + 1n) {
          const to = from + BATCH > head ? head : from + BATCH
          try {
            const logs = await client.getLogs({
              address: IPIN_ADDRESS,
              event: POT_CREATED_EVENT,
              args: { owner: address },
              fromBlock: from,
              toBlock: to,
            })
            for (const l of logs) {
              const id = (l.args as { potId: bigint }).potId
              if (id) allIds.push(id)
            }
          } catch {
            // Skip failed batch
          }
        }

        setPotIds(allIds.reverse())
      } catch {
        // Keep existing ids on error
      } finally {
        setInitialLoading(false)
        setRefreshing(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, refreshKey])

  // Full-page spinner on first load only
  if (initialLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin" style={{ color: 'var(--color-mute)' }} />
      </div>
    )
  }

  if (potIds.length === 0) {
    return (
      <div
        className="rise-in rounded-3xl border p-12 text-center"
        style={{ borderColor: 'rgba(27,24,19,0.10)', background: 'var(--color-panel)' }}
      >
        <div
          className="mx-auto mb-5 flex size-16 items-center justify-center rounded-3xl text-2xl font-bold"
          style={{ background: 'rgba(0,122,102,0.08)', color: 'var(--color-laterite)' }}
        >
          IP
        </div>
        <h3 className="text-xl font-bold">No pots yet</h3>
        <p className="mx-auto mt-2 max-w-xs text-sm" style={{ color: 'var(--color-mute)' }}>
          Create your first pot, fund it with USDC, and pay all recipients in one transaction.
        </p>
        <button
          onClick={onCreatePot}
          className="btn-primary mx-auto mt-6 px-8"
        >
          Create your first pot
        </button>
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
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs disabled:opacity-40"
          style={{ color: 'var(--color-mute)' }}
        >
          <RefreshCw className={`size-3 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <div className="flex flex-col gap-4">
        {potIds.map(id => (
          <PotCard
            key={id.toString()}
            potId={id}
            createdAt={createdAtMap[id.toString()]}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </div>
  )
}
