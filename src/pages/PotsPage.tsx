import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { Plus } from 'lucide-react'
import PotList from '../components/PotList'
import CreatePotModal from '../components/CreatePotModal'

export default function PotsPage() {
  const { isConnected } = useAccount()
  const [showCreate, setShowCreate] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  if (!isConnected) return <Navigate to="/" replace />

  return (
    <main className="relative z-10 mx-auto max-w-6xl px-4 pb-28 pt-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ letterSpacing: '-0.02em' }}>Your pots</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-mute)' }}>
            Fund a pot, then pay everyone at once.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary h-11 shrink-0 gap-1.5 px-5 text-sm"
        >
          <Plus className="size-4" />
          New pot
        </button>
      </div>

      <PotList
        refreshKey={refreshKey}
        onRefresh={() => setRefreshKey(k => k + 1)}
        onCreatePot={() => setShowCreate(true)}
      />

      <CreatePotModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); setRefreshKey(k => k + 1) }}
      />
    </main>
  )
}
