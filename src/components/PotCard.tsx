import { useEffect, useState } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useSwitchChain } from 'wagmi'
import { erc20Abi } from 'viem'
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { IPIN_CONTRACT, IPIN_ADDRESS, USDC_ADDRESS, ARC_CHAIN_ID } from '../contract'
import { formatAddress, formatUsdc, parseOnchainError } from '../utils'
import FundSheet from './FundSheet'
import WithdrawSheet from './WithdrawSheet'

/** Build an Arc Mainnet explorer URL for a transaction hash */
function buildTxExplorerUrl(hash: string): string {
  return `https://arc.etherscan.io/tx/${hash}`
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
  createdAt?: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

// Distinct wagmi write instances so their states don't collide
export default function PotCard({ potId, onRefresh, createdAt }: Props) {
  const { address: walletAddress, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const [expanded, setExpanded] = useState(false)
  const [showFund, setShowFund] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [closedAfterPay, setClosedAfterPay] = useState(false)

  // ── reads ──────────────────────────────────────────────────────────────
  const { data: potData, refetch: refetchPot } = useReadContract({
    ...IPIN_CONTRACT,
    functionName: 'getPot',
    args: [potId],
    chainId: ARC_CHAIN_ID,
  })

  const { data: recipientsRaw, refetch: refetchRecipients } = useReadContract({
    ...IPIN_CONTRACT,
    functionName: 'getRecipients',
    args: [potId],
    chainId: ARC_CHAIN_ID,
  })

  // Read USDC allowance so we can label the Fund button correctly
  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [walletAddress!, IPIN_ADDRESS],
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!walletAddress },
  })

  const refetch = () => { void refetchPot(); void refetchRecipients(); onRefresh() }

  // ── payAll write (primary) ────────────────────────────────────────────
  const {
    writeContract: writePayAll,
    data: payHash,
    isPending: payPending,
    reset: payReset,
  } = useWriteContract()
  const { isLoading: payConfirming, isSuccess: paySuccess } =
    useWaitForTransactionReceipt({ hash: payHash })

  // ── payBestEffort write (fallback) ────────────────────────────────────
  const {
    writeContract: writeBestEffort,
    data: bestEffortHash,
    isPending: bestEffortPending,
    reset: bestEffortReset,
  } = useWriteContract()
  const { isLoading: bestEffortConfirming, isSuccess: bestEffortSuccess } =
    useWaitForTransactionReceipt({ hash: bestEffortHash })

  // ── closePot write (auto-triggered after payAll) ───────────────────────
  const {
    writeContract: writeClose,
    data: closeHash,
    isPending: closePending,
    reset: closeReset,
  } = useWriteContract()
  const { isLoading: closeConfirming, isSuccess: closeSuccess } =
    useWaitForTransactionReceipt({ hash: closeHash })

  // After payAll confirms → immediately close the pot
  useEffect(() => {
    if (paySuccess) {
      payReset()
      setClosedAfterPay(true)
      writeClose({ ...IPIN_CONTRACT, functionName: 'closePot', args: [potId], __mode: 'prepared' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paySuccess])

  // After payBestEffort confirms → also auto-close
  useEffect(() => {
    if (bestEffortSuccess) {
      bestEffortReset()
      setClosedAfterPay(true)
      writeClose({ ...IPIN_CONTRACT, functionName: 'closePot', args: [potId], __mode: 'prepared' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bestEffortSuccess])

  useEffect(() => {
    if (closeSuccess) {
      toast.success(closedAfterPay ? 'Pot paid and closed!' : 'Pot closed — withdraw your funds.')
      setClosedAfterPay(false)
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

  // Determine if the user still needs to approve before funding
  // (allowance undefined while loading — default to showing "Approve & Fund")
  const still = totalAllocated - fundedAmount
  const hasAllowance = (allowance ?? 0n) >= still && still > 0n
  const fundBtnLabel = isFunded
    ? 'Add more funds'
    : hasAllowance
    ? 'Fund'
    : 'Approve & Fund'
  const allPaid = recipients.length > 0 && recipients.every(r => r.paid)
  const remaining = fundedAmount - paidOut
  const paidCount = recipients.filter(r => r.paid).length
  const failedCount = recipients.filter(r => r.failed).length
  const progress = totalAllocated > 0n ? Number((fundedAmount * 100n) / totalAllocated) : 0
  const isWorking = payPending || payConfirming || bestEffortPending || bestEffortConfirming || closePending || closeConfirming

  const ensureChain = () => {
    if (chainId !== ARC_CHAIN_ID) { switchChain({ chainId: ARC_CHAIN_ID }); return false }
    return true
  }

  const handlePayAll = () => {
    if (!ensureChain()) return
    if (fundedAmount === 0n) { toast.error('Fund the pot before paying.'); return }
    try {
      writePayAll({ ...IPIN_CONTRACT, functionName: 'payAll', args: [potId], __mode: 'prepared' })
    } catch (e) { toast.error(parseOnchainError(e)) }
  }

  const handlePayAnyway = () => {
    if (!ensureChain()) return
    try {
      writeBestEffort({ ...IPIN_CONTRACT, functionName: 'payBestEffort', args: [potId], __mode: 'prepared' })
    } catch (e) { toast.error(parseOnchainError(e)) }
  }

  // Status badge
  const statusLabel = closed ? 'Paid & closed' : isFunded ? 'Ready to pay' : 'Needs funding'
  const statusStyle: React.CSSProperties = closed
    ? { background: 'rgba(0,122,102,0.10)', color: 'var(--color-laterite)' }
    : isFunded
    ? { background: 'rgba(47,111,107,0.10)', color: 'var(--color-river)' }
    : { background: 'rgba(27,24,19,0.06)', color: 'var(--color-mute)' }

  const payLabel = payPending || bestEffortPending
    ? 'Confirm in wallet…'
    : payConfirming || bestEffortConfirming
    ? 'Paying…'
    : closePending
    ? 'Closing pot…'
    : closeConfirming
    ? 'Confirming close…'
    : 'Pay'

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
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold leading-tight">{name}</h3>
              {createdAt && (
                <p className="mt-0.5 text-xs" style={{ color: 'var(--color-mute)' }}>
                  {timeAgo(createdAt)}
                </p>
              )}
            </div>
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
                {fundBtnLabel}
              </button>

              {/* Pay (payAll) — primary, unlocks when funded */}
              {fundedAmount > 0n && !allPaid && (
                <button
                  onClick={handlePayAll}
                  disabled={isWorking}
                  className="btn-primary h-11 gap-1.5 px-4 text-sm"
                >
                  {isWorking && <Loader2 className="size-3.5 animate-spin" />}
                  {payLabel}
                </button>
              )}

              {/* Pay anyway (payBestEffort) — fallback, only when there are failed recipients */}
              {failedCount > 0 && !closed && (
                <button
                  onClick={handlePayAnyway}
                  disabled={isWorking}
                  className="btn-ghost h-11 px-4 text-sm"
                  style={{ color: 'var(--color-danger)' }}
                >
                  Pay anyway ({failedCount} failed)
                </button>
              )}

              {/* Manual close — only shown when pot is funded but NOT yet started paying */}
              {fundedAmount > 0n && paidOut === 0n && failedCount === 0 && (
                <button
                  onClick={() => {
                    if (!ensureChain()) return
                    if (!confirm('Close this pot and recover all funds? This cannot be undone.')) return
                    writeClose({ ...IPIN_CONTRACT, functionName: 'closePot', args: [potId], __mode: 'prepared' })
                  }}
                  disabled={isWorking}
                  className="btn-ghost h-11 px-4 text-sm"
                  style={{ color: 'var(--color-danger)' }}
                >
                  {closePending || closeConfirming ? 'Closing…' : 'Close & recover'}
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

          {/* Explorer link — show for whichever pay hash is available */}
          {(payHash ?? bestEffortHash) && (
            <a
              href={buildTxExplorerUrl((payHash ?? bestEffortHash)!)}
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
