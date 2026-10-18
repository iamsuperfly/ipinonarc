import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { IPIN_CONTRACT } from '../contract'
import { formatUsdc, parseOnchainError } from '../utils'

interface Props {
  open: boolean
  potId: bigint
  remaining: bigint
  onClose: () => void
  onWithdrawn: () => void
}

export default function WithdrawSheet({ open, potId, remaining, onClose, onWithdrawn }: Props) {
  const { address } = useAccount()
  const [toAddress, setToAddress] = useState('')

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  if (isSuccess) { toast.success('Withdrawn!'); onWithdrawn(); reset(); setToAddress('') }

  const handleWithdraw = () => {
    const dest = toAddress.trim() || address
    if (!dest || !/^0x[0-9a-fA-F]{40}$/.test(dest)) { toast.error('Enter a valid destination address.'); return }
    try {
      writeContract({ ...IPIN_CONTRACT, functionName: 'withdraw', args: [potId, dest as `0x${string}`] })
    } catch (e) { toast.error(parseOnchainError(e)) }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0" style={{ background: 'rgba(27,24,19,0.45)', backdropFilter: 'blur(4px)' }} />
          <motion.section
            className="relative w-full max-w-md overflow-hidden rounded-t-3xl"
            style={{ background: 'var(--color-panel)', border: '1px solid rgba(27,24,19,0.10)' }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full" style={{ background: 'rgba(27,24,19,0.15)' }} />
            </div>

            <div className="px-6 pb-8 pt-3">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Withdraw</h2>
                <button
                  onClick={onClose}
                  className="flex size-9 items-center justify-center rounded-full"
                  style={{ border: '1px solid rgba(27,24,19,0.15)', background: 'var(--color-ground)' }}
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Amount display */}
              <div
                className="mb-5 rounded-3xl p-5 text-center"
                style={{ background: 'var(--color-ground)', border: '1px solid rgba(27,24,19,0.10)' }}
              >
                <p className="text-5xl font-bold tabular-nums" style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>
                  {formatUsdc(remaining)}
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-mute)' }}>USDC available</p>
              </div>

              {/* Destination */}
              <div className="mb-5">
                <label className="mb-1.5 block text-sm" style={{ color: 'var(--color-mute)' }}>Destination address</label>
                <input
                  value={toAddress}
                  onChange={e => setToAddress(e.target.value)}
                  placeholder={address ?? '0x…'}
                  className="input-base input-mono text-sm"
                />
                <p className="mt-1 text-xs" style={{ color: 'var(--color-mute)' }}>
                  Leave empty to send to your connected wallet.
                </p>
              </div>

              <button
                onClick={handleWithdraw}
                disabled={isPending || isConfirming}
                className="btn-primary w-full"
              >
                {isPending
                  ? <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Confirm in wallet…</span>
                  : isConfirming
                  ? <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Withdrawing…</span>
                  : 'Withdraw USDC'}
              </button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
