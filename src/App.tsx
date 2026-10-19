import { useState } from 'react'
import { useAccount } from 'wagmi'
import Header from './components/Header'
import WrongChainBanner from './components/WrongChainBanner'
import PotList from './components/PotList'
import CreatePotModal from './components/CreatePotModal'

export default function App() {
  const { isConnected } = useAccount()
  const [showCreate, setShowCreate] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="min-h-dvh">
      <Header onCreatePot={() => setShowCreate(true)} />
      <WrongChainBanner />

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-28 pt-10 sm:px-6">
        {!isConnected ? (
          /* ── Landing ── */
          <section className="grid items-start gap-12 lg:grid-cols-2">
            <div className="rise-in">
              <h1
                className="text-4xl font-bold leading-tight sm:text-5xl"
                style={{ color: 'var(--color-ink)' }}
              >
                Distribute to many people
                <br />
                <span className="phrase">on Arc</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg" style={{ color: 'var(--color-mute)' }}>
                One pot. Many people.{' '}
                <span className="phrase">USDC settles on Arc.</span>{' '}
                Recipients get the full allocation. Paid once.
              </p>

              <ol id="how" className="mt-12 grid gap-4 sm:grid-cols-2">
                {([
                  ['Create', 'Name it. Paste addresses. Set equal or custom splits.'],
                  ['Fund', 'Approve USDC and deposit into the pot.'],
                  ['Pay All', 'One transaction sends to every address at once.'],
                  ['Verify', 'The Arc transaction is the record.'],
                ] as [string, string][]).map(([t, d]) => (
                  <li
                    key={t}
                    className="rise-in rounded-3xl border p-5"
                    style={{ borderColor: 'rgba(27,24,19,0.10)', background: 'var(--color-panel)' }}
                  >
                    <h3 className="text-xl font-bold">{t}</h3>
                    <p className="mt-2 text-sm" style={{ color: 'var(--color-mute)' }}>{d}</p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Demo card */}
            <div
              className="rise-in overflow-hidden rounded-3xl border p-6"
              style={{ borderColor: 'rgba(27,24,19,0.10)', background: 'var(--color-panel)' }}
            >
              <p className="text-sm" style={{ color: 'var(--color-mute)' }}>Pool</p>
              <p className="mt-1 text-5xl font-bold leading-none tabular-nums">25,000</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-mute)' }}>USDC</p>
              <p className="phrase mt-3 h-5 text-sm">Settled on Arc</p>
              <div className="mt-4 space-y-3">
                {[
                  { name: 'Ada',   amount: '4,200' },
                  { name: 'Kunle', amount: '1,150' },
                  { name: 'Mara',  amount: '860'   },
                  { name: 'Ife',   amount: '2,040' },
                ].map(r => (
                  <div
                    key={r.name}
                    className="flex items-center justify-between rounded-2xl border px-4 py-3"
                    style={{ borderColor: 'rgba(27,24,19,0.10)' }}
                  >
                    <span className="font-medium">{r.name}</span>
                    <span className="font-mono text-sm">{r.amount} USDC</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          /* ── Dashboard ── */
          <section>
            <div className="mb-8">
              <h1 className="text-3xl font-bold">Your pots</h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-mute)' }}>
                Only your pots are shown. Create one, fund it, then pay everyone at once.
              </p>
            </div>
            <PotList
              refreshKey={refreshKey}
              onRefresh={() => setRefreshKey(k => k + 1)}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer
        className="relative z-10 border-t px-5 py-12 text-sm"
        style={{ borderColor: 'rgba(27,24,19,0.10)', color: 'var(--color-mute)' }}
      >
        <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2">
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-laterite)' }}>IPIN</p>
            <p className="mt-3 max-w-sm">A share is a share. Paid once.</p>
            <a
              href="https://x.com/iamsuperflly"
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl border"
              style={{ borderColor: 'rgba(27,24,19,0.10)', color: 'var(--color-ink)' }}
              aria-label="X"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M18.2 2H21l-6.5 7.4L22 22h-6.8l-4.3-6.6L6 22H3.2l7-8L2 2h6.9l3.9 6.1L18.2 2Zm-1.2 18h1.8L7.1 3.9H5.2L17 20Z" />
              </svg>
            </a>
          </div>
          <div>
            <p style={{ color: 'var(--color-ink)' }}>Contact</p>
            <a href="mailto:iamsuperfly02@gmail.com" className="mt-3 block hover:underline">
              iamsuperfly02@gmail.com
            </a>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl">
          © 2026 IPIN —{' '}
          <a className="hover:underline" style={{ color: 'var(--color-ink)' }} href="https://x.com/iamsuperflly" target="_blank" rel="noreferrer">
            Superfly
          </a>
        </p>
      </footer>

      <CreatePotModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); setRefreshKey(k => k + 1) }}
      />
    </div>
  )
}
