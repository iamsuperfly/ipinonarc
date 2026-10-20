import { useState, useCallback, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { decodeEventLog } from 'viem'
import { IPIN_CONTRACT, ARC_TESTNET_CHAIN_ID } from '../contract'
import { parseOnchainError } from '../utils'
import { savePot } from '../supabase'

/** Parse a human USDC string (e.g. "10.50") into 6-decimal bigint */
function parseUsdc(value: string): bigint {
  const [whole = '0', frac = ''] = value.split('.')
  const padded = frac.padEnd(6, '0').slice(0, 6)
  return BigInt(whole) * 1_000_000n + BigInt(padded)
}

interface RecipientRow {
  id: number
  address: string
  amount: string
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export default function CreatePotModal({ open, onClose, onCreated }: Props) {
  const { chainId, address } = useAccount()
  const { switchChain } = useSwitchChain()
  const [name, setName] = useState('')
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal')
  const [equalTotal, setEqualTotal] = useState('')
  const [rows, setRows] = useState<RecipientRow[]>([
    { id: 1, address: '', amount: '' },
    { id: 2, address: '', amount: '' },
  ])

  // Keep wagmi hooks alive at top level — never inside a conditional
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, data: receipt, error: receiptError } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  })

  const resetForm = useCallback(() => {
    setName('')
    setSplitMode('equal')
    setEqualTotal('')
    setRows([{ id: 1, address: '', amount: '' }, { id: 2, address: '', amount: '' }])
    reset()
  }, [reset])

  // When tx confirms: save to Supabase then notify parent
  useEffect(() => {
    if (!isSuccess || !receipt) return

    // Decode PotCreated event from receipt logs to get potId + totalAllocated
    void (async () => {
      try {
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: IPIN_CONTRACT.abi,
              eventName: 'PotCreated',
              data: log.data,
              topics: log.topics,
            })
            const args = (decoded.args as unknown) as { potId: bigint; name: string; totalAllocated: bigint }
            await savePot({
              potId: args.potId,
              owner: address ?? '',
              name: args.name,
              totalAllocated: args.totalAllocated,
              txHash: receipt.transactionHash,
              chainId: ARC_TESTNET_CHAIN_ID,
            })
            break
          } catch {
            // Not the PotCreated log, skip
          }
        }
      } catch {
        // Supabase save failed — pot is still onchain, just won't appear until RPC fallback
        console.error('Failed to save pot to Supabase')
      }
      toast.success('Pot created!')
      onCreated()
      resetForm()
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess])

  const addRow = () => setRows(r => [...r, { id: Date.now(), address: '', amount: '' }])
  const removeRow = (id: number) => setRows(r => r.filter(x => x.id !== id))
  const updateRow = (id: number, field: 'address' | 'amount', value: string) =>
    setRows(r => r.map(x => x.id === id ? { ...x, [field]: value } : x))

  // Only allow closing if no tx is in flight
  const handleClose = () => {
    if (isPending || isConfirming) return
    resetForm()
    onClose()
  }

  const handleCreate = () => {
    if (chainId !== ARC_TESTNET_CHAIN_ID) {
      switchChain({ chainId: ARC_TESTNET_CHAIN_ID })
      return
    }
    if (!name.trim()) { toast.error('Give the pot a name.'); return }

    const addresses: string[] = []
    const amounts: bigint[] = []

    for (const row of rows) {
      const addr = row.address.trim()
      if (!addr) continue
      if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) { toast.error(`Invalid address: ${addr}`); return }
      addresses.push(addr)
      if (splitMode === 'custom') {
        const n = parseFloat(row.amount)
        if (isNaN(n) || n <= 0) { toast.error(`Invalid amount for ${addr}`); return }
        amounts.push(parseUsdc(row.amount))
      }
    }

    if (addresses.length === 0) { toast.error('Add at least one recipient.'); return }

    if (splitMode === 'equal') {
      const total = parseFloat(equalTotal)
      if (isNaN(total) || total <= 0) { toast.error('Enter a valid total USDC amount.'); return }
      const perPerson = total / addresses.length
      const perPersonRaw = parseUsdc(perPerson.toFixed(6))
      for (let i = 0; i < addresses.length; i++) amounts.push(perPersonRaw)
    }

    writeContract({
      ...IPIN_CONTRACT,
      functionName: 'createPot',
      args: [name.trim(), addresses as `0x${string}`[], amounts],
      // Skip wagmi's internal simulateContract call — on Rabby mobile (and other
      // injected wallets on custom chains), simulation routes through the wallet's
      // own RPC which can fail/timeout on unknown chains like Arc Testnet, leaving
      // the wallet popup blank with no Sign button. __mode: 'prepared' sends the
      // tx directly to the wallet for signing without pre-simulation.
      __mode: 'prepared',
    })
  }

  const filledAddresses = rows.filter(r => r.address.trim()).length

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0" style={{ background: 'rgba(27,24,19,0.45)', backdropFilter: 'blur(4px)' }} />

          <motion.section
            className="relative flex w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl"
            style={{
              background: 'var(--color-panel)',
              border: '1px solid rgba(27,24,19,0.10)',
              maxHeight: '92dvh',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
          >
            {/* drag handle */}
            <div className="flex shrink-0 justify-center pt-3 pb-1 sm:hidden">
              <div className="h-1 w-10 rounded-full" style={{ background: 'rgba(27,24,19,0.15)' }} />
            </div>

            <div className="overflow-y-auto px-6 pb-8 pt-4 sm:pt-6">
              {/* Title row */}
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Create a distribution</h2>
                <button
                  onClick={handleClose}
                  disabled={isPending || isConfirming}
                  className="flex size-9 items-center justify-center rounded-full transition-colors disabled:opacity-40"
                  style={{ border: '1px solid rgba(27,24,19,0.15)', background: 'var(--color-ground)' }}
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Name */}
              <div className="mb-4">
                <label className="mb-1.5 block text-sm" style={{ color: 'var(--color-mute)' }}>Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="September rewards"
                  className="input-base"
                />
              </div>

              {/* Split mode */}
              <div className="mb-4">
                <label className="mb-1.5 block text-sm" style={{ color: 'var(--color-mute)' }}>Split mode</label>
                <div
                  className="flex rounded-2xl p-1 gap-1"
                  style={{ background: 'var(--color-ground)', border: '1px solid rgba(27,24,19,0.12)' }}
                >
                  {(['equal', 'custom'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setSplitMode(mode)}
                      className="flex-1 rounded-xl py-2 text-sm font-semibold capitalize transition-all"
                      style={{
                        background: splitMode === mode ? 'var(--color-laterite)' : 'transparent',
                        color: splitMode === mode ? '#fffdf8' : 'var(--color-mute)',
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Equal total */}
              {splitMode === 'equal' && (
                <div className="mb-4">
                  <label className="mb-1.5 block text-sm" style={{ color: 'var(--color-mute)' }}>Total USDC</label>
                  <div
                    className="flex h-14 items-center gap-2 rounded-2xl border px-4"
                    style={{ borderColor: 'rgba(27,24,19,0.15)', background: 'var(--color-ground)' }}
                  >
                    <input
                      inputMode="decimal"
                      value={equalTotal}
                      onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, ''); if (v === '' || /^\d*\.?\d*$/.test(v)) setEqualTotal(v) }}
                      placeholder="0.00"
                      className="flex-1 bg-transparent text-2xl font-bold tabular-nums outline-none placeholder:opacity-30"
                      style={{ color: 'var(--color-ink)', fontFamily: 'ui-monospace, Menlo, monospace' }}
                    />
                    <span className="text-sm font-medium" style={{ color: 'var(--color-mute)' }}>USDC</span>
                  </div>
                  {equalTotal && filledAddresses > 0 && (
                    <p className="mt-1 text-xs" style={{ color: 'var(--color-mute)' }}>
                      {(parseFloat(equalTotal) / filledAddresses).toFixed(6)} USDC per recipient
                    </p>
                  )}
                </div>
              )}

              {/* Recipients */}
              <div className="mb-5">
                <label className="mb-1.5 block text-sm" style={{ color: 'var(--color-mute)' }}>Recipients</label>
                <div className="space-y-2">
                  {rows.map((row, idx) => (
                    <div key={row.id} className={`grid gap-2 ${splitMode === 'custom' ? 'grid-cols-[1fr_8rem_2.25rem]' : 'grid-cols-[1fr_2.25rem]'}`}>
                      <input
                        value={row.address}
                        onChange={e => updateRow(row.id, 'address', e.target.value)}
                        placeholder={`0x recipient ${idx + 1}`}
                        className="input-base input-mono text-sm"
                      />
                      {splitMode === 'custom' && (
                        <input
                          inputMode="decimal"
                          value={row.amount}
                          onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, ''); if (v === '' || /^\d*\.?\d*$/.test(v)) updateRow(row.id, 'amount', v) }}
                          placeholder="0.00"
                          className="input-base input-mono text-right"
                        />
                      )}
                      <button
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length <= 1}
                        className="flex size-12 items-center justify-center rounded-2xl transition-colors hover:bg-red-50 disabled:pointer-events-none disabled:opacity-30"
                        style={{ border: '1px solid rgba(27,24,19,0.12)', background: 'var(--color-ground)' }}
                      >
                        <Trash2 className="size-3.5" style={{ color: 'var(--color-danger)' }} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={addRow}
                    className="btn-ghost w-full gap-2 text-sm"
                  >
                    <Plus className="size-4" />
                    Add recipient
                  </button>
                </div>
              </div>

              {/* In-flight status */}
              {(isPending || isConfirming) && (
                <div
                  className="mb-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm"
                  style={{ background: 'rgba(0,122,102,0.08)', color: 'var(--color-laterite)' }}
                >
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                  {isPending ? 'Check your wallet to confirm…' : 'Transaction confirming on Arc…'}
                </div>
              )}

              {/* Error display */}
              {(writeError || receiptError) && (
                <div
                  className="mb-4 rounded-2xl px-4 py-3 text-sm"
                  style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--color-danger)' }}
                >
                  {parseOnchainError(writeError ?? receiptError)}
                </div>
              )}

              {/* CTA */}
              <button
                onClick={handleCreate}
                disabled={isPending || isConfirming}
                className="btn-primary w-full"
              >
                {isPending || isConfirming
                  ? <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />{isPending ? 'Waiting for wallet…' : 'Confirming…'}</span>
                  : 'Create distribution'}
              </button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
