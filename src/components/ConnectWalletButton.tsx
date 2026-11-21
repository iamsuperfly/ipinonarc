import { useEffect, useRef } from 'react'
import { useConnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { toast } from 'sonner'
import { hasInjectedWallet } from '../wallet'

interface Props {
  className?: string
  label?: string
}

/**
 * Connect button with feedback. Previously every "Connect wallet"
 * button called connect({ connector: injected() }) directly, so a
 * visitor with no wallet installed clicked and nothing happened —
 * no modal, no error, no hint. Now a missing provider gets a clear
 * message and a link to install one, and a rejected/failed connect
 * surfaces as a toast instead of failing silently.
 */
export default function ConnectWalletButton({ className, label }: Props) {
  const { connect, isPending, error } = useConnect()
  const lastError = useRef('')

  useEffect(() => {
    if (!error || error.message === lastError.current) return
    lastError.current = error.message
    const msg = error.message.toLowerCase()
    toast.error(
      msg.includes('rejected') || msg.includes('denied')
        ? 'Connection cancelled.'
        : 'Could not connect wallet.',
      { description: 'Check your wallet and try again.' },
    )
  }, [error])

  const handleClick = () => {
    if (!hasInjectedWallet()) {
      toast.error('No wallet detected.', {
        description: 'Install MetaMask or Rabby, then try again.',
        action: {
          label: 'Get MetaMask',
          onClick: () =>
            window.open('https://metamask.io/download/', '_blank', 'noopener,noreferrer'),
        },
      })
      return
    }
    try {
      connect({ connector: injected() })
    } catch {
      toast.error('Could not connect wallet.', {
        description: 'Check your wallet and try again.',
      })
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={className ?? 'btn-primary h-10 px-5 text-sm'}
    >
      {isPending ? 'Connecting…' : (label ?? 'Connect wallet')}
    </button>
  )
}
