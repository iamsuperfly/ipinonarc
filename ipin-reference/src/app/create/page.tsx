"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { decodeEventLog, isAddress } from "viem";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { ipinAbi } from "@/lib/abi";
import { ipinAddress } from "@/lib/contract";
import { writeErrorText } from "@/lib/errors";
import { USDC } from "@/lib/tokens";

type Row = { address: string; share: string };

export default function CreatePage() {
  const router = useRouter();
  const contract = ipinAddress();
  const { isConnected } = useAccount();
  const [name, setName] = useState("");
  const [rows, setRows] = useState<Row[]>([{ address: "", share: "50" }, { address: "", share: "50" }]);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { data: receipt, isLoading: waiting } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!receipt) return;
    const created = receipt.logs.map((log) => {
      try { return decodeEventLog({ abi: ipinAbi, data: log.data, topics: log.topics }); } catch { return null; }
    }).find((e) => e && e.eventName === "PotCreated");
    if (created && created.eventName === "PotCreated") router.replace(`/pot/${String(created.args.id)}`);
  }, [receipt, router]);

  function submit() {
    if (!contract || !name.trim()) return;
    const members = rows.map((r) => r.address.trim());
    if (members.some((m) => !isAddress(m))) return;
    writeContract({
      address: contract,
      abi: ipinAbi,
      functionName: "createPot",
      args: [name.trim(), USDC, members as `0x${string}`[], rows.map((r) => BigInt(r.share || "0"))],
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pb-24 pt-10">
      <h1 className="font-display text-4xl">Create a pot</h1>
      <p className="mt-3 text-mute">USDC only. EURC remains in the contract and is not offered here.</p>
      <div className="mt-8 space-y-4 rounded-3xl border border-ink/10 bg-panel p-6">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="h-12 w-full rounded-2xl border border-ink/15 bg-ground px-4 outline-none focus:border-laterite" />
        {rows.map((row, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[1fr_7rem]">
            <input value={row.address} onChange={(e) => { const next = [...rows]; next[i] = { ...row, address: e.target.value }; setRows(next); }} placeholder="0x" className="h-12 rounded-2xl border border-ink/15 bg-ground px-4 font-mono text-sm outline-none focus:border-laterite" />
            <input value={row.share} onChange={(e) => { const next = [...rows]; next[i] = { ...row, share: e.target.value }; setRows(next); }} placeholder="Share" className="h-12 rounded-2xl border border-ink/15 bg-ground px-4 font-mono outline-none focus:border-laterite" />
          </div>
        ))}
        <button type="button" className="btn-ghost w-full" onClick={() => setRows([...rows, { address: "", share: "1" }])}>Add member</button>
        {isConnected ? <button type="button" className="btn-primary w-full" disabled={!contract || isPending || waiting} onClick={submit}>Create pot</button> : <ConnectButton className="w-full" />}
        {error && <p className="text-sm text-danger">{writeErrorText(error)}</p>}
      </div>
    </main>
  );
}
