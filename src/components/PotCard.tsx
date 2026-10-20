import { useEffect, useState } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useSwitchChain } from 'wagmi'
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { IPIN_CONTRACT, ARC_TESTNET_CHAIN_ID } from '../contract'
import { formatAddress, formatUsdc, parseOnchainError } from '../utils'
import FundSheet from './FundSheet'
import WithdrawSheet from './WithdrawSheet'

/** Build an Arc Testnet explorer URL for a transaction hash */
function buildTxExplorerUrl(hash: string): string {
  return `https://explorer.testnet.arc.io/tx/${hash}`
}

interface RecipientData {
  addr: string
  amount: bigint
  paid: boolean
  failed: boolean
}

interface Props {
  potId: bigint
  onRefresh: () => void
}

// Distinct wagmi write instances so their states don't collide
export default function PotCard({ potId, onRefresh }: Props) {
  const { address: walletAddress, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const [expanded, setExpanded] = useState(false)
  const [showFund, setShowFund] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)

  // ── reads ──────────────────────────────────────────────────────────────
  const { data: potData, refetch: refetchPot } = useReadContract({
    ...IPIN_CONTRACT,
    functionName: 'getPot',
    args: [potId],
    chainId: ARC_TESTNET_CHAIN_ID,
  })

  const { data: recipientsRaw, refetch: refetchRecipients } = useReadContract({
    ...IPIN_CONTRACT,
    functionName: 'getRecipients',
    args: [potId],
    chainId: ARC_TESTNET_CHAIN_ID,
  })

  const refetch = () => { void refetchPot(); void refetchRecipients(); onRefresh() }

  // ── payAll write ───────────────────────────────────────────────────────
  const {
    writeContract: writePayAll,
    data: payHash,
    isPending: payPending,
    reset: payReset,
  } = useWriteContract()
  const { isLoading: payConfirming, isSuccess: paySuccess } =
    useWaitForTransactionReceipt({ hash: payHash })

  // ── closePot write (auto-triggered after payAll) ───────────────────────
  const {
    writeContract: writeClose,
    data: closeHash,
    isPending: closePending,
    reset: closeReset,
  } = useWriteContract()
  const { isLoading: closeConfirming, isSuccess: closeSuccess } =
    useWaitForTransactionReceipt({ hash: closeHash })

  // After payAll confirms → immediately close the pot (no extra step for user)
  useEffect(() => {
    if (paySuccess) {
      payReset()
      // auto-close
      writeClose({ ...IPIN_CONTRACT, functionName: 'closePot', args: [potId], __mode: 'prepared' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paySuccess])

  useEffect(() => {
    if (closeSuccess) {
      toast.success('Pot paid and closed!')
      closeReset()
      refetch()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeSuccess])

  // ── derived state ──────────────────────────────────────────────────────
  if (!potData) {
    return (
      <div
        className="flex h-32 items-center justify-center rounded-3xl border"
        style={{ borderColor: 'rgba(27,24,19,0.10)', background: 'var(--color-panel)' }}
      >
        <Loader2 className="size-5 animate-spin" style={{ color: 'var(--color-mute)' }} />
      </div>
    )
  }

  const [name, owner, totalAllocated, fundedAmount, paidOut, closed] =
    potData as [string, string, bigint, bigint, bigint, boolean]
  const recipients = (recipientsRaw ?? []) as RecipientData[]
  const isOwner = walletAddress?.toLowerCase() === owner.toLowerCase()
  const isFunded = fundedAmount >= totalAllocated
  const allPaid = recipients.length > 0 && recipients.every(r => r.paid)
  const remaining = fundedAmount - paidOut
  const paidCount = recipients.filter(r => r.paid).length
  const failedCount = recipients.filter(r => r.failed).length
  const progress = totalAllocated > 0n ? Number((fundedAmount * 100n) / totalAllocated) : 0
  const isWorking = payPending || payConfirming || closePending || closeConfirming

  const ensureChain = () => {
    if (chainId !== ARC_TESTNET_CHAIN_ID) { switchChain({ chainId: ARC_TESTNET_CHAIN_ID }); return false }
    return true
  }

  const handlePayAll = () => {
    if (!ensureChain()) return
    if (!isFunded) { toast.error('Fund the pot to 100% before paying.'); return }
    try {
      writePayAll({ ...IPIN_CONTRACT, functionName: 'payAll', args: [potId], __mode: 'prepared' })
    } catch (e) { toast.error(parseOnchainError(e)) }
  }

  // Status badge
  const statusLabel = closed ? 'Paid & closed' : isFunded ? 'Ready to pay' : 'Needs funding'
  const statusStyle: React.CSSProperties = closed
    ? { background: 'rgba(0,122,102,0.10)', color: 'var(--color-laterite)' }
    : isFunded
    ? { background: 'rgba(47,111,107,0.10)', color: 'var(--color-river)' }
    : { background: 'rgba(27,24,19,0.06)', color: 'var(--color-mute)' }

  // Working label for Pay All button
  const payLabel = payPending
    ? 'Confirm in wallet…'
    : payConfirming
    ? 'Paying everyone…'
    : closePending
    ? 'Closing pot…'
    : closeConfirming
    ? 'Confirming close…'
    : 'Pay All'

  return (
    <>
      <div
        className="rise-in overflow-hidden rounded-3xl border"
        style={{
          borderColor: closed ? 'rgba(0,122,102,0.25)' : 'rgba(27,24,19,0.10)',
          background: 'var(--color-panel)',
        }}
      >
        <div className="p-5 sm:p-6">

          {/* Header */}
          <div className="mb-4 flex items-start justify-between gap-3">
            <h3 className="truncate text-lg font-bold leading-tight">{name}</h3>
            <span className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold" style={statusStyle}>
              {statusLabel}
            </span>
          </div>

          {/* Stats grid */}
          <div className="mb-4 grid grid-cols-3 gap-2">
            {[
              { label: 'Allocated', value: formatUsdc(totalAllocated) },
              { label: 'Funded',    value: formatUsdc(fundedAmount) },
              { label: 'Paid out',  value: formatUsdc(paidOut) },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-2xl p-3 text-center"
                style={{ background: 'var(--color-ground)', border: '1px solid rgba(27,24,19,0.08)' }}
              >
                <div className="font-mono text-sm font-bold tabular-nums">{value}</div>
                <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--color-mute)' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Funding progress — only while open and unfunded */}
          {!closed && !isFunded && (
            <div className="mb-4">
              <div className="mb-1 flex justify-between text-xs" style={{ color: 'var(--color-mute)' }}>
                <span>Funding progress</span>
                <span className="tabular-nums">{Math.min(progress, 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(27,24,19,0.08)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%`, background: 'var(--color-river)' }}
                />
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--color-mute)' }}>
                {formatUsdc(totalAllocated - fundedAmount)} USDC still needed
              </p>
            </div>
          )}

          {/* Recipient summary */}
          <div className="mb-4 flex items-center gap-3 text-xs" style={{ color: 'var(--color-mute)' }}>
            <span>{recipients.length} {recipients.length === 1 ? 'recipient' : 'recipients'}</span>
            {paidCount > 0 && <span style={{ color: 'var(--color-laterite)' }}>{paidCount} paid</span>}
            {failedCount > 0 && <span style={{ color: 'var(--color-danger)' }}>{failedCount} failed</span>}
          </div>

          {/* ── Owner actions ── */}
          {isOwner && !closed && (
            <div className="flex flex-wrap gap-2">
              {/* Fund is always available while pot is open */}
              <button onClick={() => setShowFund(true)} className="btn-ghost h-11 px-4 text-sm">
                {isFunded ? 'Add more funds' : 'Fund'}
              </button>

              {/* Pay All only unlocks when fully funded */}
              {isFunded && !allPaid && (
                <button
                  onClick={handlePayAll}
                  disabled={isWorking}
                  className="btn-primary h-11 gap-1.5 px-4 text-sm"
                >
                  {isWorking && <Loader2 className="size-3.5 animate-spin" />}
                  {payLabel}
                </button>
              )}

              {/* If all paid but pot somehow still open (edge case) */}
              {allPaid && (
                <span className="flex h-11 items-center px-2 text-xs" style={{ color: 'var(--color-laterite)' }}>
                  All paid — closing…
                </span>
              )}
            </div>
          )}

          {/* Withdraw residual after pot is closed */}
          {isOwner && closed && remaining > 0n && (
            <button onClick={() => setShowWithdraw(true)} className="btn-ghost h-11 px-4 text-sm">
              Withdraw {formatUsdc(remaining)} USDC
            </button>
          )}

          {/* Explorer link */}
          {payHash && (
            <a
              href={buildTxExplorerUrl(payHash)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs"
              style={{ color: 'var(--color-laterite)' }}
            >
              View on Arc explorer <ExternalLink className="size-3" />
            </a>
          )}

          {/* Expand recipients */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-4 flex w-full items-center justify-between rounded-2xl px-4 py-2.5 text-xs font-medium transition-colors"
            style={{ border: '1px solid rgba(27,24,19,0.12)', background: 'var(--color-ground)', color: 'var(--color-mute)' }}
          >
            <span>Recipients ({recipients.length})</span>
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>

          {expanded && recipients.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {recipients.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-2xl px-4 py-3"
                  style={{ background: 'var(--color-ground)', border: '1px solid rgba(27,24,19,0.08)' }}
                >
                  <div className="flex items-center gap-2">
                    {r.paid
                      ? <CheckCircle className="size-3.5 shrink-0" style={{ color: 'var(--color-laterite)' }} />
                      : r.failed
                      ? <XCircle className="size-3.5 shrink-0" style={{ color: 'var(--color-danger)' }} />
                      : <Clock className="size-3.5 shrink-0" style={{ color: 'var(--color-mute)' }} />}
                    <span className="font-mono text-xs">{formatAddress(r.addr)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs tabular-nums">{formatUsdc(r.amount)} USDC</span>
                    {r.paid && <span className="text-[10px] font-semibold" style={{ color: 'var(--color-laterite)' }}>paid</span>}
                    {r.failed && <span className="text-[10px] font-semibold" style={{ color: 'var(--color-danger)' }}>failed</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <FundSheet
        open={showFund}
        potId={potId}
        totalAllocated={totalAllocated}
        fundedAmount={fundedAmount}
        onClose={() => setShowFund(false)}
        onFunded={() => { setShowFund(false); refetch() }}
      />
      <WithdrawSheet
        open={showWithdraw}
        potId={potId}
        remaining={remaining}
        onClose={() => setShowWithdraw(false)}
        onWithdrawn={() => { setShowWithdraw(false); refetch() }}
      />
    </>
  )
}
