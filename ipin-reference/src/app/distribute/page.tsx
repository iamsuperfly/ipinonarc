"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { decodeEventLog, isAddress } from "viem";
import { useAccount, usePublicClient, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { openArcWallet, setPending } from "@/lib/arcSession";
import { ipinAbi } from "@/lib/abi";
import { ipinAddress } from "@/lib/contract";
import { writeErrorText } from "@/lib/errors";
import { quoteFee } from "@/lib/fee";
import { formatUsdc, parseUsdc } from "@/lib/format";
import { supabaseBrowser } from "@/lib/supabase";
import { USDC } from "@/lib/tokens";

type Row = { address: string; amount: string; edited: boolean };

function split(total: string, rows: Row[]): Row[] {
  const people = rows.length || 1;
  const base = parseUsdc(total || "0");
  const each = base / BigInt(people);
  const remainder = base - each * BigInt(people);
  return rows.map((row, i) => {
    if (row.edited) return row;
    const share = each + (i === 0 ? remainder : 0n);
    return { ...row, amount: formatUsdc(share) };
  });
}

export default function DistributePage() {
  const router = useRouter();
  const params = useSearchParams();
  const contract = ipinAddress();
  const client = usePublicClient();
  const { isConnected } = useAccount();
  const [arc, setArc] = useState("");
  const [name, setName] = useState(params.get("name") || "");
  const [total, setTotal] = useState(params.get("total") || "100");
  const [rows, setRows] = useState<Row[]>([{ address: "", amount: "50", edited: false }, { address: "", amount: "50", edited: false }]);
  const [note, setNote] = useState("");
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    setArc(window.localStorage.getItem("ipin-circle-address") || "");
  }, []);

  useEffect(() => {
    if (!isSuccess || !hash || !client || !contract) return;
    let gone = false;
    client.getTransactionReceipt({ hash }).then(async (receipt) => {
      if (gone) return;
      const created = receipt.logs
        .map((log) => {
          try { return decodeEventLog({ abi: ipinAbi, data: log.data, topics: log.topics }); } catch { return null; }
        })
        .find((log) => log?.eventName === "PotCreated");
      const potId = created && "args" in created ? created.args.id : null;
      if (potId == null) return;
      router.replace(`/pot/${potId.toString()}`);
    });
    return () => { gone = true; };
  }, [isSuccess, hash, client, contract, router]);

  const even = useMemo(() => split(total, rows), [total, rows]);
  const pool = useMemo(() => even.reduce((sum, row) => sum + parseUsdc(row.amount || "0"), 0n), [even]);
  const quote = quoteFee(0n, pool);

  function add() {
    setRows(split(total, [...rows, { address: "", amount: "0", edited: false }]));
  }

  async function linkPot(potId: number) {
    const sb = supabaseBrowser();
    const user = sb ? (await sb.auth.getUser()).data.user : null;
    if (!sb || !user) return;
    await sb.from("campaigns").update({ pot_id: potId, status: "waiting" }).eq("account_id", user.id).eq("name", name.trim()).is("pot_id", null);
  }

  async function saveCampaign() {
    const sb = supabaseBrowser();
    const user = sb ? (await sb.auth.getUser()).data.user : null;
    if (sb && user) {
      await sb.from("campaigns").insert({ account_id: user.id, name: name.trim(), pool_amount: Number(formatUsdc(pool)), status: "waiting", pot_id: null });
    }
  }

  async function finishCircle(userToken: string, walletId: string) {
    if (!client) return;
    const sb = supabaseBrowser();
    const session = sb ? (await sb.auth.getSession()).data.session : null;
    if (!session) return;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const status = await fetch("/api/circle/tx", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "status", userToken, walletId }),
      });
      const json = await status.json().catch(() => ({}));
      if (json.hash) {
        const receipt = await client.getTransactionReceipt({ hash: json.hash as `0x${string}` }).catch(() => null);
        if (receipt) {
          const created = receipt.logs
            .map((log) => {
              try { return decodeEventLog({ abi: ipinAbi, data: log.data, topics: log.topics }); } catch { return null; }
            })
            .find((log) => log?.eventName === "PotCreated");
          const potId = created && "args" in created ? Number(created.args.id) : null;
          if (potId != null) {
            await linkPot(potId);
            router.replace(`/pot/${potId}`);
            return;
          }
        }
      }
      await new Promise((resolve) => window.setTimeout(resolve, 2000));
    }
    setNote("The Arc wallet confirmed, but the pot is not on Arc yet. Try again.");
  }

  function createParams() {
    return {
      abiFunctionSignature: "createPot(string,address,address[],uint96[])",
      abiParameters: [
        name.trim(),
        USDC,
        even.map((row) => row.address.trim()),
        even.map((row) => parseUsdc(row.amount || "0").toString()),
      ],
    };
  }

  async function refreshWalletId(userToken: string): Promise<string> {
    const sb = supabaseBrowser();
    const session = sb ? (await sb.auth.getSession()).data.session : null;
    if (!session) return "";
    const listed = await fetch("/api/circle/wallet", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ userToken }),
    });
    const json = await listed.json().catch(() => ({}));
    const fresh = (json.walletId as string) || "";
    if (fresh) window.localStorage.setItem("ipin-circle-wallet", fresh);
    if (json.address) window.localStorage.setItem("ipin-circle-address", json.address);
    return fresh;
  }

  async function circleCreate() {
    if (!contract) return;
    const userToken = window.sessionStorage.getItem("ipin-circle-user") || "";
    let walletId = window.localStorage.getItem("ipin-circle-wallet") || "";
    const params = createParams();
    if (!userToken) {
      setPending({ kind: "create", name: name.trim(), contractAddress: contract, ...params });
      openArcWallet();
      setNote("Opening the Arc wallet. It will ask you to confirm the create after.");
      return;
    }
    const fresh = await refreshWalletId(userToken);
    if (fresh) walletId = fresh;
    if (!walletId) {
      setPending({ kind: "create", name: name.trim(), contractAddress: contract, ...params });
      openArcWallet();
      setNote("Opening the Arc wallet so it can sign.");
      return;
    }
    const headers = await (async () => {
      const sb = supabaseBrowser();
      const session = sb ? (await sb.auth.getSession()).data.session : null;
      return session ? { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" } : null;
    })();
    if (!headers) {
      setNote("Sign in before creating a distribution.");
      return;
    }
    const created = await fetch("/api/circle/tx", {
      method: "POST",
      headers,
      body: JSON.stringify({ kind: "contract", userToken, walletId, contractAddress: contract, ...params }),
    });
    const json = await created.json().catch(() => ({}));
    if (!created.ok || !json.challengeId) {
      const raw = json.error || "";
      const friendly = /cannot find target wallet/i.test(raw)
        ? "The Arc wallet is not ready. Open it once, then try again."
        : raw || "Couldn't ask the Arc wallet to create it.";
      setNote(friendly);
      return;
    }
    await saveCampaign();
    setNote("Confirm in the Arc wallet.");
    window.dispatchEvent(new CustomEvent("ipin-circle-exec", { detail: json.challengeId }));
    window.setTimeout(() => void finishCircle(userToken, walletId), 3000);
  }

  async function submit() {
    if (!contract || !name.trim()) return;
    const members = even.map((r) => r.address.trim());
    if (members.some((m) => !isAddress(m))) {
      setNote("Every recipient needs a real address.");
      return;
    }
    if (arc) {
      await circleCreate();
      return;
    }
    await saveCampaign();
    writeContract({
      address: contract,
      abi: ipinAbi,
      functionName: "createPot",
      args: [name.trim(), USDC, members as `0x${string}`[], even.map((r) => parseUsdc(r.amount || "0"))],
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pb-24 pt-10">
      <h1 className="text-4xl font-bold">Create a distribution</h1>
      <p className="mt-3 text-mute">The total splits equally. Change one amount if someone should get a different share.</p>
      <div className="mt-8 space-y-4 rounded-3xl border border-ink/10 bg-panel p-6">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="September rewards" className="h-12 w-full rounded-2xl border border-ink/15 bg-ground px-4 outline-none focus:border-laterite" />
        <label className="block text-sm text-mute">Total USDC
          <input value={total} onChange={(e) => setTotal(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-ink/15 bg-ground px-4 font-mono outline-none focus:border-laterite" />
        </label>
        {even.map((row, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <input value={row.address} onChange={(e) => { const next = [...even]; next[i] = { ...row, address: e.target.value }; setRows(next); }} placeholder="0x recipient" className="h-12 rounded-2xl border border-ink/15 bg-ground px-4 font-mono text-sm outline-none focus:border-laterite" />
            <input value={row.amount} onChange={(e) => { const next = [...even]; next[i] = { ...row, amount: e.target.value, edited: true }; setRows(next); }} className="h-12 rounded-2xl border border-ink/15 bg-ground px-4 font-mono outline-none focus:border-laterite" />
          </div>
        ))}
        <button type="button" className="btn-ghost w-full" onClick={add}>Add recipient</button>
        <p className="text-sm text-mute">Recipients receive {formatUsdc(pool)} USDC. Fee on top: {formatUsdc(quote.fee)}. {arc ? "The Arc wallet signs this." : "Start the Arc wallet to sign without connecting."}</p>
        {arc ? (
          <button type="button" className="btn-primary w-full" disabled={!contract || isPending || isLoading} onClick={submit}>{isPending || isLoading ? "Creating\u2026" : "Create distribution"}</button>
        ) : isConnected ? (
          <button type="button" className="btn-primary w-full" disabled={!contract || isPending || isLoading} onClick={submit}>{isPending || isLoading ? "Creating\u2026" : "Create distribution"}</button>
        ) : (
          <button type="button" className="btn-primary w-full" onClick={() => { openArcWallet(); setNote("Opening the Arc wallet."); }}>Start the Arc wallet</button>
        )}
        {isSuccess && <p className="text-sm text-mute">Created. Opening it so you can fund and pay.</p>}
        {note && <p className="text-sm text-mute">{note}</p>}
        {error && <p className="text-sm text-danger">{writeErrorText(error)}</p>}
      </div>
    </main>
  );
}
