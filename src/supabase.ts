import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  console.warn('Supabase env vars missing — pot list will fall back to RPC scan')
}

export const supabase = createClient(url, key)

export interface PotRow {
  id: number
  pot_id: number
  owner: string
  name: string
  total_allocated: number
  tx_hash: string
  chain_id: number
  created_at: string
}

/** Save a newly created pot to Supabase right after the tx confirms. */
export async function savePot(data: {
  potId: bigint
  owner: string
  name: string
  totalAllocated: bigint
  txHash: string
  chainId: number
}): Promise<void> {
  const { error } = await supabase.from('pots').insert({
    pot_id: Number(data.potId),
    owner: data.owner.toLowerCase(),
    name: data.name,
    total_allocated: Number(data.totalAllocated) / 1_000_000,
    tx_hash: data.txHash,
    chain_id: data.chainId,
  })
  if (error) console.error('Supabase savePot error:', error.message)
}

/** Fetch all pot IDs for a wallet address, newest first. */
export async function fetchPotIds(owner: string, chainId: number): Promise<bigint[]> {
  const { data, error } = await supabase
    .from('pots')
    .select('pot_id')
    .eq('chain_id', chainId)
    .ilike('owner', owner.toLowerCase())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Supabase fetchPotIds error:', error.message)
    return []
  }
  return (data ?? []).map(r => {
    const potId = Number((r as Record<string, unknown>)['pot_id'])
    return BigInt(potId)
  })
}
