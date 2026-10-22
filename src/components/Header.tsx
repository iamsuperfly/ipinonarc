import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAccount, useConnect, useDisconnect, useReadContract } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { erc20Abi } from 'viem'
import { Menu, X, LogOut, Copy, Check, User, Layers } from 'lucide-react'
import { USDC_ADDRESS, ARC_TESTNET_CHAIN_ID } from '../contract'
import { formatUsdc } from '../utils'

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function useUsdcBalance(address?: `0x${string}`) {
  const { data } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address!],
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!address, refetchInterval: 15_000 },
  })
  return data ?? 0n
}

export default function Header() {
  const { address, isConnected } = useAccount()
  const { connect, isPending: connecting } = useConnect()
  const { disconnect } = useDisconnect()
  const navigate = useNavigate()
  const balance = useUsdcBalance(address)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showWalletMenu, setShowWalletMenu] = useState(false)

  const closeMobile = () => setMobileOpen(false)

  const handleCopy = () => {
    if (!address) return
    void navigator.clipboard.writeText(address).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-semibold transition-colors ${
      isActive
        ? 'text-[var(--color-laterite)]'
        : 'text-[var(--color-mute)] hover:text-[var(--color-ink)]'
    }`

  return (
    <header
      className="sticky top-0 z-40 border-b bg-[#f7f6f2]/95 backdrop-blur-md"
      style={{ borderColor: 'rgba(27,24,19,0.10)' }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <button
          onClick={() => void navigate('/')}
          className="text-xl font-bold"
          style={{ color: 'var(--color-laterite)' }}
        >
          IPIN
        </button>

        {/* Desktop nav + wallet */}
        <div className="hidden items-center gap-5 sm:flex">
          {isConnected && (
            <>
              <NavLink to="/pots" className={navLinkClass}>Pots</NavLink>
              <NavLink to="/profile" className={navLinkClass}>Profile</NavLink>
            </>
          )}

          {isConnected && address ? (
            <div className="relative">
              <button
                onClick={() => setShowWalletMenu(v => !v)}
                className="btn-ghost h-10 gap-2 px-4 text-sm"
              >
                <span className="size-2 rounded-full" style={{ background: 'var(--color-laterite)' }} />
                {shortAddr(address)}
              </button>
              {showWalletMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowWalletMenu(false)} />
                  <div
                    className="absolute right-0 top-full z-20 mt-1.5 w-56 overflow-hidden rounded-2xl border shadow-lg"
                    style={{ background: 'var(--color-panel)', borderColor: 'rgba(27,24,19,0.12)' }}
                  >
                    {/* Balance */}
                    <div
                      className="flex items-center justify-between px-4 py-3 border-b"
                      style={{ borderColor: 'rgba(27,24,19,0.08)' }}
                    >
                      <span className="text-xs" style={{ color: 'var(--color-mute)' }}>Balance</span>
                      <span className="font-mono text-xs font-semibold tabular-nums" style={{ color: 'var(--color-laterite)' }}>
                        {formatUsdc(balance)} USDC
                      </span>
                    </div>
                    {/* Copy address */}
                    <button
                      onClick={handleCopy}
                      className="flex w-full items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-black/5 border-b"
                      style={{ borderColor: 'rgba(27,24,19,0.08)' }}
                    >
                      <span className="font-mono text-xs" style={{ color: 'var(--color-mute)' }}>{shortAddr(address)}</span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: copied ? 'var(--color-laterite)' : 'var(--color-mute)' }}>
                        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                        {copied ? 'Copied' : 'Copy'}
                      </span>
                    </button>
                    {/* Disconnect */}
                    <button
                      onClick={() => { disconnect(); setShowWalletMenu(false); void navigate('/') }}
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
          ) : (
            <button
              onClick={() => connect({ connector: injected() })}
              disabled={connecting}
              className="btn-primary h-10 px-5 text-sm"
            >
              {connecting ? 'Connecting…' : 'Connect wallet'}
            </button>
          )}
        </div>

        {/* Mobile: hamburger when connected, connect button when not */}
        <div className="flex items-center sm:hidden">
          {isConnected ? (
            <button
              className="flex size-11 items-center justify-center rounded-full border"
              style={{ borderColor: 'rgba(27,24,19,0.15)' }}
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          ) : (
            <button
              onClick={() => connect({ connector: injected() })}
              disabled={connecting}
              className="btn-primary h-10 px-5 text-sm"
            >
              {connecting ? 'Connecting…' : 'Connect wallet'}
            </button>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && isConnected && address && (
        <div
          className="flex flex-col border-t sm:hidden"
          style={{ borderColor: 'rgba(27,24,19,0.10)', background: '#f7f6f2' }}
        >
          {/* Balance row */}
          <div
            className="flex items-center justify-between px-5 py-3 border-b"
            style={{ borderColor: 'rgba(27,24,19,0.08)' }}
          >
            <span className="text-sm" style={{ color: 'var(--color-mute)' }}>Balance</span>
            <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: 'var(--color-laterite)' }}>
              {formatUsdc(balance)} USDC
            </span>
          </div>

          {/* Wallet address + copy */}
          <div
            className="flex items-center justify-between px-5 py-3 border-b"
            style={{ borderColor: 'rgba(27,24,19,0.08)' }}
          >
            <span className="font-mono text-xs" style={{ color: 'var(--color-mute)' }}>{shortAddr(address)}</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs"
              style={{ color: copied ? 'var(--color-laterite)' : 'var(--color-mute)' }}
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Nav links */}
          <NavLink
            to="/pots"
            onClick={closeMobile}
            className="flex items-center gap-3 px-5 py-4 text-sm font-semibold border-b"
            style={({ isActive }) => ({
              borderColor: 'rgba(27,24,19,0.08)',
              color: isActive ? 'var(--color-laterite)' : 'var(--color-ink)',
            })}
          >
            <Layers className="size-4" />
            Pots
          </NavLink>
          <NavLink
            to="/profile"
            onClick={closeMobile}
            className="flex items-center gap-3 px-5 py-4 text-sm font-semibold border-b"
            style={({ isActive }) => ({
              borderColor: 'rgba(27,24,19,0.08)',
              color: isActive ? 'var(--color-laterite)' : 'var(--color-ink)',
            })}
          >
            <User className="size-4" />
            Profile
          </NavLink>

          {/* Disconnect */}
          <button
            onClick={() => { disconnect(); closeMobile(); void navigate('/') }}
            className="flex items-center gap-3 px-5 py-4 text-sm font-semibold"
            style={{ color: 'var(--color-danger)' }}
          >
            <LogOut className="size-4" />
            Disconnect
          </button>
        </div>
      )}
    </header>
  )
}
