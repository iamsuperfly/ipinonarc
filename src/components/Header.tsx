import { useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { Plus, Menu, X, Wallet, LogOut } from 'lucide-react'

interface Props {
  onCreatePot: () => void
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function ConnectButton() {
  const { address, isConnected } = useAccount()
  const { connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [showMenu, setShowMenu] = useState(false)

  if (isConnected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(v => !v)}
          className="btn-ghost h-11 gap-2 px-4 text-sm"
        >
          <Wallet className="size-4" />
          {shortAddr(address)}
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div
              className="absolute right-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-2xl border shadow-lg"
              style={{ background: 'var(--color-panel)', borderColor: 'rgba(27,24,19,0.12)' }}
            >
              <button
                onClick={() => { disconnect(); setShowMenu(false) }}
                className="flex w-full items-center gap-2.5 px-4 py-3 text-sm transition-colors hover:bg-black/5"
                style={{ color: 'var(--color-danger)' }}
              >
                <LogOut className="size-4" />
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
      className="btn-primary h-11 px-5 text-sm"
    >
      {isPending ? 'Connecting…' : 'Connect wallet'}
    </button>
  )
}

export default function Header({ onCreatePot }: Props) {
  const { isConnected } = useAccount()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header
      className="sticky top-0 z-40 border-b bg-[#f7f6f2]/95 backdrop-blur-md"
      style={{ borderColor: 'rgba(27,24,19,0.10)' }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <span className="text-xl font-bold" style={{ color: 'var(--color-laterite)' }}>
          IPIN
        </span>

        {/* Desktop right */}
        <div className="hidden items-center gap-3 sm:flex">
          {isConnected && (
            <button onClick={onCreatePot} className="btn-ghost h-11 gap-1.5 px-4 text-sm">
              <Plus className="size-4" />
              New pot
            </button>
          )}
          <ConnectButton />
        </div>

        {/* Mobile: hamburger — only when connected */}
        {isConnected && (
          <button
            className="flex size-11 items-center justify-center rounded-full border sm:hidden"
            style={{ borderColor: 'rgba(27,24,19,0.15)' }}
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        )}

        {/* Mobile: connect button when not connected */}
        {!isConnected && (
          <div className="sm:hidden">
            <ConnectButton />
          </div>
        )}
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="flex flex-col gap-3 border-t px-5 py-4 sm:hidden"
          style={{ borderColor: 'rgba(27,24,19,0.10)', background: '#f7f6f2' }}
        >
          <ConnectButton />
          {isConnected && (
            <button
              onClick={() => { onCreatePot(); setMobileOpen(false) }}
              className="btn-primary w-full gap-1.5"
            >
              <Plus className="size-4" />
              New pot
            </button>
          )}
        </div>
      )}
    </header>
  )
}
