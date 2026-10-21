import { useState } from 'react'
import { useAccount, useConnect, useDisconnect, useReadContract } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { erc20Abi } from 'viem'
import { Plus, Menu, X, LogOut, Copy, Check } from 'lucide-react'
import { USDC_ADDRESS, ARC_TESTNET_CHAIN_ID } from '../contract'
import { formatUsdc } from '../utils'

interface Props {
  onCreatePot: () => void
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function UsdcBalance({ address }: { address: `0x${string}` }) {
  const { data } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { refetchInterval: 15_000 },
  })
  const bal = data ?? 0n
  return (
    <span
      className="hidden rounded-full px-3 py-1 font-mono text-xs font-semibold tabular-nums sm:inline-flex"
      style={{ background: 'rgba(0,122,102,0.10)', color: 'var(--color-laterite)' }}
    >
      {formatUsdc(bal)} USDC
    </span>
  )
}

function ConnectButton({ onCreatePot }: { onCreatePot?: () => void }) {
  const { address, isConnected } = useAccount()
  const { connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!address) return
    void navigator.clipboard.writeText(address).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  if (isConnected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(v => !v)}
          className="btn-ghost h-11 gap-2 px-4 text-sm"
        >
          <span
            className="size-2 rounded-full"
            style={{ background: 'var(--color-laterite)' }}
          />
          {shortAddr(address)}
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div
              className="absolute right-0 top-full z-20 mt-1.5 w-52 overflow-hidden rounded-2xl border shadow-lg"
              style={{ background: 'var(--color-panel)', borderColor: 'rgba(27,24,19,0.12)' }}
            >
              {/* Address + copy */}
              <div
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: 'rgba(27,24,19,0.08)' }}
              >
                <span className="font-mono text-xs" style={{ color: 'var(--color-mute)' }}>
                  {shortAddr(address)}
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-black/5"
                  style={{ color: copied ? 'var(--color-laterite)' : 'var(--color-mute)' }}
                >
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              {/* USDC balance in dropdown */}
              <div
                className="flex items-center justify-between px-4 py-2.5 border-b"
                style={{ borderColor: 'rgba(27,24,19,0.08)' }}
              >
                <span className="text-xs" style={{ color: 'var(--color-mute)' }}>Balance</span>
                <UsdcBalance address={address} />
              </div>
              {/* New pot */}
              {onCreatePot && (
                <button
                  onClick={() => { onCreatePot(); setShowMenu(false) }}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-sm transition-colors hover:bg-black/5 border-b"
                  style={{ borderColor: 'rgba(27,24,19,0.08)' }}
                >
                  <Plus className="size-4" />
                  New pot
                </button>
              )}
              {/* Disconnect */}
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
  const { isConnected, address } = useAccount()
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
          {isConnected && address && <UsdcBalance address={address} />}
          {isConnected && (
            <button onClick={onCreatePot} className="btn-ghost h-11 gap-1.5 px-4 text-sm">
              <Plus className="size-4" />
              New pot
            </button>
          )}
          <ConnectButton />
        </div>

        {/* Mobile: hamburger when connected */}
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
      {mobileOpen && isConnected && address && (
        <div
          className="flex flex-col gap-3 border-t px-5 py-4 sm:hidden"
          style={{ borderColor: 'rgba(27,24,19,0.10)', background: '#f7f6f2' }}
        >
          {/* Balance row */}
          <div className="flex items-center justify-between rounded-2xl px-4 py-3"
            style={{ background: 'var(--color-panel)', border: '1px solid rgba(27,24,19,0.10)' }}
          >
            <span className="text-sm" style={{ color: 'var(--color-mute)' }}>Balance</span>
            <UsdcBalance address={address} />
          </div>
          <ConnectButton onCreatePot={() => { onCreatePot(); setMobileOpen(false) }} />
          <button
            onClick={() => { onCreatePot(); setMobileOpen(false) }}
            className="btn-primary w-full gap-1.5"
          >
            <Plus className="size-4" />
            New pot
          </button>
        </div>
      )}
    </header>
  )
}
