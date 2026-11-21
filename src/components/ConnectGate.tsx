import { Link } from 'react-router-dom'
import ConnectWalletButton from './ConnectWalletButton'

interface Props {
  title: string
  description: string
}

/**
 * Shown on wallet-gated pages (/pots, /profile) when no wallet is
 * connected. Previously those pages silently redirected to "/",
 * which looked like a broken link. The gate explains what is needed
 * and offers the connect action in place.
 */
export default function ConnectGate({ title, description }: Props) {
  return (
    <main className="relative z-10 mx-auto max-w-6xl px-4 pb-28 pt-10 sm:px-6">
      <div
        className="rounded-3xl border p-8 text-center sm:p-12"
        style={{ borderColor: 'rgba(27,24,19,0.10)', background: 'var(--color-panel)' }}
      >
        <div
          className="mx-auto mb-5 flex size-16 items-center justify-center rounded-3xl text-2xl font-bold"
          style={{ background: 'rgba(0,122,102,0.08)', color: 'var(--color-laterite)' }}
        >
          IPIN
        </div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: 'var(--color-mute)' }}>
          {description}
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <ConnectWalletButton className="btn-primary px-8" />
          <Link
            to="/"
            className="text-sm font-semibold hover:underline"
            style={{ color: 'var(--color-laterite)' }}
          >
            ← Back to home
          </Link>
        </div>
        <p className="mx-auto mt-6 max-w-md text-xs" style={{ color: 'var(--color-mute)' }}>
          IPIN runs on Arc Mainnet (chain ID 5042). No wallet yet? Install MetaMask or Rabby
          first, then connect.
        </p>
      </div>
    </main>
  )
}
