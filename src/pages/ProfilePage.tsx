import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useReadContract } from 'wagmi'
import { erc20Abi } from 'viem'
import { Loader2 } from 'lucide-react'
import { USDC_ADDRESS, IPIN_ADDRESS, ARC_TESTNET_CHAIN_ID } from '../contract'
import { fetchPots } from '../supabase'
import { formatUsdc } from '../utils'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rise-in rounded-3xl border p-6"
      style={{ borderColor: 'rgba(27,24,19,0.10)', background: 'var(--color-panel)' }}
    >
      <p className="text-sm" style={{ color: 'var(--color-mute)' }}>{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums" style={{ letterSpacing: '-0.02em' }}>{value}</p>
    </div>
  )
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount()
  const [loading, setLoading] = useState(true)
  const [totalPots, setTotalPots] = useState(0)
  const [totalAllocated, setTotalAllocated] = useState(0)

  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address!],
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!address },
  })

  useEffect(() => {
    if (!address) return
    void (async () => {
      const rows = await fetchPots(address, ARC_TESTNET_CHAIN_ID, IPIN_ADDRESS)
      setTotalPots(rows.length)
      setTotalAllocated(rows.reduce((sum, r) => sum + Number(r.total_allocated), 0))
      setLoading(false)
    })()
  }, [address])

  if (!isConnected) return <Navigate to="/" replace />

  return (
    <main className="relative z-10 mx-auto max-w-6xl px-4 pb-28 pt-10 sm:px-6">
      {/* Identity */}
      <div className="rise-in mb-10">
        <div className="flex items-center gap-4">
          <div
            className="flex size-14 items-center justify-center rounded-2xl text-lg font-bold"
            style={{ background: 'rgba(0,122,102,0.10)', color: 'var(--color-laterite)' }}
          >
            IPIN
          </div>
          <div>
            <p className="font-mono text-sm" style={{ color: 'var(--color-mute)' }}>Wallet</p>
            <p className="font-mono text-sm font-semibold break-all" style={{ color: 'var(--color-ink)' }}>
              {address}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <h2 className="mb-4 text-xl font-bold" style={{ letterSpacing: '-0.01em' }}>Stats</h2>
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin" style={{ color: 'var(--color-mute)' }} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Pots created" value={String(totalPots)} />
          <StatCard
            label="USDC allocated"
            value={`$${totalAllocated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          />
          <StatCard
            label="Wallet balance"
            value={`${formatUsdc(usdcBalance ?? 0n)} USDC`}
          />
        </div>
      )}

      {/* Chain note */}
      <p className="mt-10 text-xs" style={{ color: 'var(--color-mute)' }}>
        Stats are based on pots created through IPIN on Arc Testnet.
        Allocated totals are recorded at creation time.
      </p>
    </main>
  )
}
