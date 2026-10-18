import { useState, useCallback } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { IPIN_CONTRACT, ARC_TESTNET_CHAIN_ID } from '../contract'
import { parseOnchainError } from '../utils'
import { parseAmount } from '@/onchain-money'

interface RecipientRow {
  id: number
  address: string
  amount: string
}

interface Props {
  onClose: () => void
  onCreated: () => void
}

export default function CreatePotModal({ onClose, onCreated }: Props) {
  const { chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const [name, setName] = useState('')
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal')
  const [equalTotal, setEqualTotal] = useState('')
  const [rows, setRows] = useState<RecipientRow[]>([
    { id: 1, address: '', amount: '' },
    { id: 2, address: '', amount: '' },
  ])

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const addRow = () => setRows(r => [...r, { id: Date.now(), address: '', amount: '' }])
  const removeRow = (id: number) => setRows(r => r.filter(x => x.id !== id))
  const updateRow = (id: number, field: 'address' | 'amount', value: string) =>
    setRows(r => r.map(x => x.id === id ? { ...x, [field]: value } : x))

  const handleClose = useCallback(() => {
    setName('')
    setSplitMode('equal')
    setEqualTotal('')
    setRows([{ id: 1, address: '', amount: '' }, { id: 2, address: '', amount: '' }])
    reset()
    onClose()
  }, [onClose, reset])

  if (isSuccess) {
    toast.success('Pot created!')
    onCreated()
    handleClose()
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
        amounts.push(parseAmount(ARC_TESTNET_CHAIN_ID, row.amount).raw)
      }
    }

    if (addresses.length === 0) { toast.error('Add at least one recipient.'); return }

    if (splitMode === 'equal') {
      const total = parseFloat(equalTotal)
      if (isNaN(total) || total <= 0) { toast.error('Enter a valid total USDC amount.'); return }
      const perPerson = total / addresses.length
      const perPersonRaw = parseAmount(ARC_TESTNET_CHAIN_ID, perPerson.toFixed(6)).raw
      for (let i = 0; i < addresses.length; i++) amounts.push(perPersonRaw)
    }

    try {
      writeContract({
        ...IPIN_CONTRACT,
        functionName: 'createPot',
        args: [name.trim(), addresses as `0x${string}`[], amounts],
      })
    } catch (e) {
      toast.error(parseOnchainError(e))
    }
  }

  const filledAddresses = rows.filter(r => r.address.trim()).length

  return (
    <AnimatePresence>
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
          className="relative w-full max-w-lg overflow-hidden rounded-t-3xl sm:rounded-3xl"
          style={{ background: 'var(--color-panel)', border: '1px solid rgba(27,24,19,0.10)' }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
        >
          {/* drag handle */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="h-1 w-10 rounded-full" style={{ background: 'rgba(27,24,19,0.15)' }} />
          </div>

          <div className="px-6 pb-8 pt-4 sm:pt-6">
            {/* Title row */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Create a distribution</h2>
              <button
                onClick={handleClose}
                className="flex size-9 items-center justify-center rounded-full transition-colors"
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

            {/* CTA */}
            <button
              onClick={handleCreate}
              disabled={isPending || isConfirming}
              className="btn-primary w-full"
            >
              {isPending
                ? <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Confirm in wallet…</span>
                : isConfirming
                ? <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Creating…</span>
                : 'Create distribution'}
            </button>
          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  )
}
