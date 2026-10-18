"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { isAddress } from "viem";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { openArcWallet, setPending } from "@/lib/arcSession";
import { erc20Abi, ipinAbi } from "@/lib/abi";
import { explorerAddress, explorerTx } from "@/lib/chain";
import { ipinAddress } from "@/lib/contract";
import { writeErrorText } from "@/lib/errors";
import { quoteFee } from "@/lib/fee";
import { nextFundStep } from "@/lib/fund";
import { formatUsdc, parseUsdc, shortAddr } from "@/lib/format";
import { supabaseBrowser } from "@/lib/supabase";
import { USDC, tokenSymbol } from "@/lib/tokens";
import { withdrawAbi } from "@/lib/withdraw";

export default function PotPage() {
  const params = useParams<{ id: string }>();
  const id = BigInt(params.id || "0");
  const contract = ipinAddress();
  const { address, isConnected } = useAccount();
  const [arc, setArc] = useState("");
  const [amount, setAmount] = useState("");
  const [locked, setLocked] = useState(false);
  const [note, setNote] = useState("");
  const [action, setAction] = useState("");
  const [withdrawTo, setWithdrawTo] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  useEffect(() => {
    setArc(window.localStorage.getItem("ipin-circle-address") || "");
  }, []);

  const pot = useReadContract({
    address: contract,
    abi: ipinAbi,
    functionName: "pots",
    args: [id],
    query: { enabled: Boolean(contract && params.id) },
  });
  const roster = useReadContract({
    address: contract,
    abi: ipinAbi,
    functionName: "membersOf",
    args: [id],
    query: { enabled: Boolean(contract && params.id) },
  });
  const walletUsdc = useReadContract({
    address: USDC,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const allowance = useReadContract({
    address: USDC,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && contract ? [address, contract] : undefined,
    query: { enabled: Boolean(address && contract) },
  });

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: waiting, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) return;
    sb.from("campaigns").select("pool_amount").eq("pot_id", Number(id)).maybeSingle().then(({ data }) => {
      if (data?.pool_amount == null) return;
      setAmount(String(data.pool_amount));
      setLocked(true);
    });
  }, [id]);

  useEffect(() => {
    if (!isSuccess || !hash || !contract) return;
    pot.refetch();
    roster.refetch();
    walletUsdc.refetch();
    allowance.refetch();
    if (action === "approve") {
      setAction("fund");
      setNote("Approved. Confirm the fund in the wallet.");
      writeContract({
        address: contract,
        abi: ipinAbi,
        functionName: "fund",
        args: [id, parseUsdc(amount)],
      });
      return;
    }
    if (action === "fund" || action === "withdraw") {
      setNote(action === "withdraw" ? "Withdraw sent." : "Fund sent. The balance updates when Arc confirms.");
      return;
    }
  }, [isSuccess, hash, action, amount, contract, id, pot, roster, walletUsdc, allowance]);

  useEffect(() => {
    const onResult = (event: Event) => {
      const detail = (event as CustomEvent<{ ok?: boolean; note?: string }>).detail;
      if (!detail) return;
      setNote(detail.note || (detail.ok ? "Arc wallet confirmed." : "The Arc wallet did not finish."));
      if (detail.ok) {
        pot.refetch();
        roster.refetch();
        walletUsdc.refetch();
      }
    };
    window.addEventListener("ipin-circle-result", onResult);
    return () => window.removeEventListener("ipin-circle-result", onResult);
  }, [pot, roster, walletUsdc]);

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

  function friendly(raw: string) {
    return /cannot find target wallet/i.test(raw)
      ? "The Arc wallet is not ready. Open it once, then try again."
      : raw;
  }

  function needArc(kind: "fund" | "pay", signature: string, args: readonly unknown[]) {
    if (!contract) return;
    setPending({
      kind,
      contractAddress: contract,
      abiFunctionSignature: signature,
      abiParameters: args.map((value) => String(value)),
    });
    openArcWallet();
    setNote("Opening the Arc wallet. Confirm it, then it will sign.");
  }

  async function circleCall(functionName: "fund" | "payAll", args: readonly unknown[]) {
    if (!contract) return;
    const userToken = window.sessionStorage.getItem("ipin-circle-user") || "";
    let walletId = window.localStorage.getItem("ipin-circle-wallet") || "";
    const sb = supabaseBrowser();
    const session = sb ? (await sb.auth.getSession()).data.session : null;
    const signature = functionName === "fund" ? "fund(uint256,uint256)" : "payAll(uint256)";
    if (!session || !userToken) {
      needArc(functionName === "fund" ? "fund" : "pay", signature, args);
      return;
    }
    const fresh = await refreshWalletId(userToken);
    if (fresh) walletId = fresh;
    if (!walletId) {
      needArc(functionName === "fund" ? "fund" : "pay", signature, args);
      return;
    }
    const created = await fetch("/api/circle/tx", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "contract",
        userToken,
        walletId,
        contractAddress: contract,
        abiFunctionSignature: signature,
        abiParameters: args.map((value) => String(value)),
      }),
    });
    const json = await created.json().catch(() => ({}));
    if (!created.ok || !json.challengeId) {
      setNote(friendly(json.error || "Couldn't ask the Arc wallet to sign."));
      return;
    }
    setNote("Confirm in the Arc wallet.");
    window.dispatchEvent(new CustomEvent("ipin-circle-exec", { detail: json.challengeId }));
  }

  async function withdrawArc() {
    if (!isAddress(withdrawTo) || !withdrawAmount) {
      setNote("Enter an address and an amount.");
      return;
    }
    const userToken = window.sessionStorage.getItem("ipin-circle-user") || "";
    let walletId = window.localStorage.getItem("ipin-circle-wallet") || "";
    const sb = supabaseBrowser();
    const session = sb ? (await sb.auth.getSession()).data.session : null;
    if (!session || !userToken) {
      setPending({ kind: "withdraw", to: withdrawTo, amount: withdrawAmount });
      openArcWallet();
      setNote("Opening the Arc wallet. Confirm it, then it will send.");
      return;
    }
    const fresh = await refreshWalletId(userToken);
    if (fresh) walletId = fresh;
    if (!walletId) {
      setPending({ kind: "withdraw", to: withdrawTo, amount: withdrawAmount });
      openArcWallet();
      setNote("Opening the Arc wallet. Confirm it, then it will send.");
      return;
    }
    const created = await fetch("/api/circle/tx", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "transfer", userToken, walletId, to: withdrawTo, amount: withdrawAmount }),
    });
    const json = await created.json().catch(() => ({}));
    if (!created.ok || !json.challengeId) {
      setNote(friendly(json.error || "Couldn't send from the Arc wallet."));
      return;
    }
    setNote("Confirm the send in the Arc wallet.");
    window.dispatchEvent(new CustomEvent("ipin-circle-exec", { detail: json.challengeId }));
  }

  const busy = isPending || waiting;
  const data = pot.data;
  const owner = data?.[0];
  const name = data?.[1];
  const token = data?.[2];
  const totalShares = data?.[4] ?? 0n;
  const round = data?.[5] ?? 0;
  const balance = (data?.[6] ?? 0n) as bigint;
  const symbol = tokenSymbol(token);
  const arcOwns = Boolean(arc && owner && arc.toLowerCase() === owner.toLowerCase());
  const isOwner = arcOwns || Boolean(address && owner && address.toLowerCase() === owner.toLowerCase());
  const walletBalance = (walletUsdc.data ?? 0n) as bigint;
  const canPay = balance > 0n;
  const members = roster.data?.[0] ?? [];
  const shares = roster.data?.[1] ?? [];
  const paidFlags = roster.data?.[2] ?? [];
  const units = parseUsdc(amount || "0");
  const fee = quoteFee(0n, units).fee;

  function fundOnce() {
    if (arcOwns) {
      void circleCall("fund", [id, units]);
      return;
    }
    if (!contract || !token) return;
    const step = nextFundStep(walletBalance, units + fee, (allowance.data ?? 0n) as bigint);
    if (step === "amount") {
      setNote("This distribution has no amount yet.");
      return;
    }
    if (step === "short") {
      setNote("The wallet does not have enough USDC on Arc.");
      return;
    }
    if (step === "approve") {
      setAction("approve");
      setNote("Confirm the approval. The fund is the next wallet prompt.");
      writeContract({
        address: token,
        abi: erc20Abi,
        functionName: "approve",
        args: [contract, units + fee],
      });
      return;
    }
    setAction("fund");
    setNote("Confirm the fund in the wallet.");
    writeContract({
      address: contract,
      abi: ipinAbi,
      functionName: "fund",
      args: [id, units],
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-8">
      <p className="text-sm text-laterite">Distribution {params.id} · round {String(round)} · {symbol}</p>
      <h1 className="mt-2 text-4xl font-bold">{name || "Distribution"}</h1>
      <p className="mt-2 text-mute">
        Owner{" "}
        {owner && (
          <a className="font-mono text-ink hover:text-laterite" href={explorerAddress(owner)} target="_blank" rel="noreferrer">
            {shortAddr(owner)}
          </a>
        )}
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-ink/10 bg-panel p-6">
          <p className="text-sm text-mute">In the distribution</p>
          <p className="mt-2 text-4xl font-bold tabular-nums">{formatUsdc(balance)} {symbol}</p>
        </div>
        <div className="rounded-3xl border border-ink/10 bg-panel p-6">
          <p className="text-sm text-mute">Your USDC on Arc</p>
          <p className="mt-2 text-4xl font-bold tabular-nums">{isConnected ? formatUsdc(walletBalance) : arc ? "Arc wallet" : "-"} USDC</p>
        </div>
      </div>
      <section className="mt-8 space-y-3">
        {members.map((m, i) => {
          const sh = shares[i] ?? 0n;
          const pct = totalShares === 0n ? 0 : Number((sh * 1000n) / totalShares) / 10;
          const done = paidFlags[i];
          return (
            <div key={m} className="rounded-2xl border border-ink/10 bg-panel p-4">
              <div className="flex items-center justify-between gap-3">
                <a className="font-mono text-sm hover:text-laterite" href={explorerAddress(m)} target="_blank" rel="noreferrer">{shortAddr(m)}</a>
                {done ? <span className="text-sm font-semibold text-laterite">Paid</span> : <span className="text-sm text-mute">Unpaid</span>}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-ground"><div className="h-full bg-laterite" style={{ width: `${pct}%` }} /></div>
              <p className="mt-2 text-sm text-mute">{pct}%</p>
            </div>
          );
        })}
      </section>
      <section className="mt-8 rounded-3xl border border-ink/10 bg-panel p-6">
        <h2 className="text-2xl font-bold">Fund</h2>
        <p className="mt-1 text-sm text-mute">{arcOwns ? "The Arc wallet signs this." : "The amount is the one set at create."}</p>
        <input value={amount} readOnly={locked} onChange={(e) => setAmount(e.target.value)} className="mt-4 h-12 w-full rounded-2xl border border-ink/15 bg-ground px-4 font-mono outline-none focus:border-laterite" />
        {fee > 0n && <p className="mt-2 text-sm text-mute">Fee on top {formatUsdc(fee)} USDC. Recipients still get the full amount.</p>}
        {arcOwns || isConnected ? (
          <button type="button" className="btn-primary mt-4 w-full" disabled={busy || !contract} onClick={fundOnce}>
            {busy ? "Confirm in the wallet" : "Approve and fund"}
          </button>
        ) : <ConnectButton className="mt-4 w-full" />}
        {note && <p className="mt-3 text-sm text-mute">{note}</p>}
        <Link href={`/bridge?pot=${params.id}`} className="mt-4 inline-block text-sm text-laterite">Sell into USDC</Link>
      </section>
      {isOwner && (
        <button type="button" className="btn-primary mt-6 w-full" disabled={busy || !contract || !canPay} onClick={() => {
          if (arcOwns) {
            void circleCall("payAll", [id]);
            return;
          }
          setAction("pay");
          contract && writeContract({ address: contract, abi: ipinAbi, functionName: "payAll", args: [id] });
        }}>
          {canPay ? "Pay everyone" : "Pay everyone after it is funded"}
        </button>
      )}
      {arc && (
        <section className="mt-6 rounded-3xl border border-ink/10 bg-panel p-6">
          <h2 className="text-2xl font-bold">Withdraw</h2>
          <p className="mt-1 text-sm text-mute">Send from the Arc wallet to an address.</p>
          <input value={withdrawTo} onChange={(e) => setWithdrawTo(e.target.value)} placeholder="0x" className="mt-4 h-12 w-full rounded-2xl border border-ink/15 bg-ground px-4 font-mono text-sm outline-none focus:border-laterite" />
          <input value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Amount" className="mt-3 h-12 w-full rounded-2xl border border-ink/15 bg-ground px-4 font-mono outline-none focus:border-laterite" />
          <button type="button" className="btn-primary mt-4 w-full" onClick={withdrawArc}>Withdraw</button>
        </section>
      )}
      {isOwner && !arcOwns && (
        <button type="button" className="btn-ghost mt-3 w-full" disabled={busy || !contract || balance === 0n} onClick={() => {
          setAction("withdraw");
          contract && writeContract({ address: contract, abi: withdrawAbi, functionName: "withdraw", args: [id] });
        }}>
          Withdraw unpaid
        </button>
      )}
      {hash && <a className="mt-4 inline-block font-mono text-sm text-laterite" href={explorerTx(hash)} target="_blank" rel="noreferrer">View transaction</a>}
      {error && <p className="mt-3 text-sm text-danger">{writeErrorText(error)}</p>}
    </main>
  );
}
