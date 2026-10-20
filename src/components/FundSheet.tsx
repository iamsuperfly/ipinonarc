import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { erc20Abi } from 'viem'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { IPIN_CONTRACT, ARC_TESTNET_CHAIN_ID } from '../contract'
import { formatUsdc, parseOnchainError } from '../utils'
import { parseAmount } from '@/onchain-money'
import { getUsdc } from '@/onchain-facts'

const USDC_ADDRESS = getUsdc(ARC_TESTNET_CHAIN_ID)!.address as `0x${string}`

interface Props {
  open: boolean
  potId: bigint
  totalAllocated: bigint
  fundedAmount: bigint
  onClose: () => void
  onFunded: () => void
}

export default function FundSheet({ open, potId, totalAllocated, fundedAmount, onClose, onFunded }: Props) {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const [amount, setAmount] = useState('')

  const still = totalAllocated - fundedAmount
  const stillFmt = formatUsdc(still)

  const { data: rawBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address!],
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!address },
  })

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address!, IPIN_CONTRACT.address],
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!address },
  })

  const balance = rawBalance ?? 0n
  const balFmt = formatUsdc(balance)

  const { writeContract: approve, data: approveHash, isPending: approvePending } = useWriteContract()
  const { isLoading: approveConfirming, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash })

  const { writeContract: fund, data: fundHash, isPending: fundPending, reset: resetFund } = useWriteContract()
  const { isLoading: fundConfirming, isSuccess: fundSuccess } = useWaitForTransactionReceipt({ hash: fundHash })

  if (approveSuccess) { void refetchAllowance(); toast.success('USDC approved.') }
  if (fundSuccess) { toast.success('Pot funded!'); onFunded(); resetFund(); setAmount('') }

  const parsedAmount = amount ? parseAmount(ARC_TESTNET_CHAIN_ID, amount).raw : 0n
  const needsApproval = parsedAmount > 0n && (allowance ?? 0n) < parsedAmount

  const ensureChain = () => {
    if (chainId !== ARC_TESTNET_CHAIN_ID) { switchChain({ chainId: ARC_TESTNET_CHAIN_ID }); return false }
    return true
  }

  const handleApprove = () => {
    if (!ensureChain()) return
    try {
      approve({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'approve', args: [IPIN_CONTRACT.address, parsedAmount], __mode: 'prepared' })
    } catch (e) { toast.error(parseOnchainError(e)) }
  }

  const handleFund = () => {
    if (!ensureChain()) return
    if (parsedAmount === 0n) { toast.error('Enter an amount.'); return }
    try {
      fund({ ...IPIN_CONTRACT, functionName: 'fund', args: [potId, parsedAmount], __mode: 'prepared' })
    } catch (e) { toast.error(parseOnchainError(e)) }
  }

  const isWorking = approvePending || approveConfirming || fundPending || fundConfirming

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
            className="relative flex w-full max-w-md flex-col rounded-t-3xl"
            style={{ background: 'var(--color-panel)', border: '1px solid rgba(27,24,19,0.10)', maxHeight: '92dvh' }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
          >
            {/* drag handle */}
            <div className="flex shrink-0 justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full" style={{ background: 'rgba(27,24,19,0.15)' }} />
            </div>

            <div className="overflow-y-auto px-6 pb-8 pt-3">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Fund pot</h2>
                <button
                  onClick={onClose}
                  className="flex size-9 items-center justify-center rounded-full"
                  style={{ border: '1px solid rgba(27,24,19,0.15)', background: 'var(--color-ground)' }}
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Status banner */}
              {still > 0n && (
                <div
                  className="mb-4 rounded-2xl px-4 py-3 text-sm"
                  style={{ background: 'rgba(0,122,102,0.08)', color: 'var(--color-laterite)' }}
                >
                  Still needed: <span className="font-mono font-bold tabular-nums">{stillFmt} USDC</span>
                </div>
              )}
              {still === 0n && (
                <div
                  className="mb-4 rounded-2xl px-4 py-3 text-sm font-semibold"
                  style={{ background: 'rgba(0,122,102,0.08)', color: 'var(--color-laterite)' }}
                >
                  Pot is fully funded.
                </div>
              )}

              {/* Amount input */}
              <div className="mb-4">
                <div
                  className="flex h-16 items-center gap-2 rounded-2xl border px-4"
                  style={{ borderColor: 'rgba(27,24,19,0.15)', background: 'var(--color-ground)' }}
                >
                  <input
                    inputMode="decimal"
                    value={amount}
                    onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, ''); if (v === '' || /^\d*\.?\d*$/.test(v)) setAmount(v) }}
                    placeholder="0.00"
                    className="flex-1 bg-transparent text-3xl font-bold tabular-nums outline-none placeholder:opacity-30"
                    style={{ color: 'var(--color-ink)', fontFamily: 'ui-monospace, Menlo, monospace' }}
                  />
                  <span className="text-sm font-medium" style={{ color: 'var(--color-mute)' }}>USDC</span>
                </div>
                <div className="mt-2 flex items-center justify-between px-1">
                  {still > 0n && (
                    <button
                      onClick={() => setAmount((Number(still) / 1e6).toFixed(6))}
                      className="text-xs font-semibold"
                      style={{ color: 'var(--color-laterite)' }}
                    >
                      Fill gap ({stillFmt})
                    </button>
                  )}
                  <button
                    disabled={!balance}
                    onClick={() => setAmount((Number(balance) / 1e6).toFixed(6))}
                    className="ml-auto text-xs disabled:opacity-40"
                    style={{ color: 'var(--color-mute)' }}
                  >
                    Balance: {balFmt} · Max
                  </button>
                </div>
              </div>

              {/* CTA */}
              {needsApproval ? (
                <button onClick={handleApprove} disabled={isWorking} className="btn-primary w-full">
                  {approvePending
                    ? <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Confirm in wallet…</span>
                    : approveConfirming
                    ? <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Approving…</span>
                    : 'Approve USDC'}
                </button>
              ) : (
                <button onClick={handleFund} disabled={isWorking || parsedAmount === 0n} className="btn-primary w-full">
                  {fundPending
                    ? <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Confirm in wallet…</span>
                    : fundConfirming
                    ? <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Funding…</span>
                    : 'Fund pot'}
                </button>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
