import { useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import ConnectWalletButton from '../components/ConnectWalletButton'

export default function LandingPage() {
  const { isConnected } = useAccount()
  const navigate = useNavigate()

  return (
    <main className="relative z-10 mx-auto max-w-6xl px-4 pb-28 pt-10 sm:px-6">
      <section className="grid items-start gap-12 lg:grid-cols-2">
        {/* Left: hero — no rise-in here, so the headline is visible
            on first paint instead of starting almost invisible */}
        <div>
          <h1
            className="text-4xl font-bold leading-tight sm:text-5xl"
            style={{ color: 'var(--color-ink)', letterSpacing: '-0.02em' }}
          >
            Distribute to many,
            <br />
            <span className="phrase">at once, on Arc.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg" style={{ color: 'var(--color-mute)' }}>
            One pot. Many people.{' '}
            <span className="phrase">USDC settles on Arc.</span>{' '}
            Recipients get the full allocation. Paid once.
          </p>

          <div className="mt-8">
            {isConnected ? (
              <button
                onClick={() => void navigate('/pots')}
                className="btn-primary px-8 text-base"
              >
                Go to my pots →
              </button>
            ) : (
              <>
                <ConnectWalletButton className="btn-primary px-8 text-base" />
                <p className="mt-3 text-sm" style={{ color: 'var(--color-mute)' }}>
                  No wallet yet?{' '}
                  <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold hover:underline"
                    style={{ color: 'var(--color-laterite)' }}
                  >
                    Get MetaMask
                  </a>{' '}
                  or{' '}
                  <a
                    href="https://rabby.io/"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold hover:underline"
                    style={{ color: 'var(--color-laterite)' }}
                  >
                    Rabby
                  </a>{' '}
                  — then connect.
                </p>
              </>
            )}
          </div>

          <h2
            id="how"
            className="mt-12 text-xl font-bold"
            style={{ letterSpacing: '-0.01em' }}
          >
            How it works
          </h2>
          <ol aria-labelledby="how" className="mt-4 grid gap-4 sm:grid-cols-2">
            {([
              ['Create', 'Name it. Paste addresses. Set equal or custom splits.'],
              ['Fund', 'Approve USDC (amount + 0.25% fee) and deposit into the pot.'],
              ['Pay', 'One transaction sends to every address at once.'],
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

        {/* Right: demo card */}
        <div
          className="rise-in overflow-hidden rounded-3xl border p-6"
          style={{ borderColor: 'rgba(27,24,19,0.10)', background: 'var(--color-panel)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-mute)' }}>Pool</p>
          <p className="mt-1 text-5xl font-bold leading-none tabular-nums">12,400</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-mute)' }}>USDC</p>
          <p className="phrase mt-3 h-5 text-sm">Settled on Arc</p>
          <div className="mt-4 space-y-3">
            {[
              { name: 'Ada',   amount: '4,200' },
              { name: 'Kunle', amount: '3,150' },
              { name: 'Mara',  amount: '2,010' },
              { name: 'Ife',   amount: '3,040' },
            ].map(r => (
              <div
                key={r.name}
                className="flex items-center justify-between rounded-2xl border px-4 py-3"
                style={{ borderColor: 'rgba(27,24,19,0.10)' }}
              >
                <span className="font-medium">{r.name}</span>
                <span className="font-mono text-sm tabular-nums">{r.amount} USDC</span>
              </div>
            ))}
          </div>
          <div
            className="mt-5 flex items-center justify-between rounded-2xl px-4 py-3"
            style={{ background: 'rgba(0,122,102,0.08)' }}
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--color-laterite)' }}>Total allocated</span>
            <span className="font-mono text-sm font-bold tabular-nums" style={{ color: 'var(--color-laterite)' }}>12,400 USDC</span>
          </div>
        </div>
      </section>
    </main>
  )
}
