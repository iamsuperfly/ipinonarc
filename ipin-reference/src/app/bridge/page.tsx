"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { encodeFunctionData, type Address } from "viem";
import { useAccount, useSendCalls, useSwitchChain, useWriteContract } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { SlideSell } from "@/components/SlideSell";
import { erc20Abi } from "@/lib/abi";
import { TOKEN_MESSENGER, tokenMessengerAbi, toBytes32Address } from "@/lib/cctp";
import { writeErrorText } from "@/lib/errors";
import { parseUsdc } from "@/lib/format";
import { SELL_ROUTES, type SellRouteId } from "@/lib/routes";
import { sellStep } from "@/lib/sell";

export default function BridgePage() {
  const search = useSearchParams();
  const pot = search.get("pot") ?? "";
  const { address, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const [source, setSource] = useState<SellRouteId>("base");
  const [amount, setAmount] = useState("1");
  const [note, setNote] = useState("Sell turns USDC on a Circle route into USDC on Arc.");
  const { writeContract, isPending, error } = useWriteContract();
  const { sendCalls, isPending: batching, error: batchError } = useSendCalls();
  const route = SELL_ROUTES.find((item) => item.id === source) ?? SELL_ROUTES[1];
  const busy = isPending || batching;

  async function sell() {
    if (!address || sellStep("USDC", route.id) !== "sell") {
      setNote("This token has no route into Arc.");
      return;
    }
    const mintTo = address as Address;
    const units = parseUsdc(amount);
    setNote("Confirm the sell in the wallet.");
    try {
      await switchChain({ chainId: route.chain.id });
      await sendCalls({
        chainId: route.chain.id,
        calls: [
          {
            to: route.usdc,
            data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [TOKEN_MESSENGER, units] }),
          },
          {
            to: TOKEN_MESSENGER,
            data: encodeFunctionData({
              abi: tokenMessengerAbi,
              functionName: "depositForBurn",
              args: [units, 26, toBytes32Address(mintTo), route.usdc, toBytes32Address("0x0000000000000000000000000000000000000000"), 0n, 2000],
            }),
          },
        ],
      });
      setNote("Sold. USDC lands on Arc after Circle attests.");
    } catch {
      setNote("The wallet needs the approval first.");
      writeContract({
        chainId: route.chain.id,
        address: route.usdc,
        abi: erc20Abi,
        functionName: "approve",
        args: [TOKEN_MESSENGER, units],
      });
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pb-24 pt-10">
      <h1 className="font-display text-4xl sm:text-5xl">Sell</h1>
      <p className="mt-3 text-mute">Slide on your phone. Click on a desktop. USDC on a Circle route becomes USDC on Arc.</p>
      <div className="mt-8 space-y-4 rounded-3xl border border-ink/10 bg-panel p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SELL_ROUTES.map((item) => (
            <button key={item.id} type="button" className={`h-12 rounded-2xl border ${source === item.id ? "border-laterite" : "border-ink/15"}`} onClick={() => setSource(item.id)}>
              {item.name}
            </button>
          ))}
        </div>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 w-full rounded-2xl border border-ink/15 bg-ground px-4 font-mono outline-none focus:border-laterite" />
        {isConnected ? (
          <>
            <SlideSell disabled={busy} onSell={sell} />
            <button type="button" className="btn-primary hidden w-full md:inline-flex" disabled={busy} onClick={sell}>Sell</button>
          </>
        ) : (
          <ConnectButton className="w-full" />
        )}
        <p className="text-sm text-mute">{note}</p>
        {(error || batchError) && <p className="text-sm text-danger">{writeErrorText(error ?? batchError)}</p>}
        {pot && <Link href={`/pot/${pot}`} className="inline-block text-sm text-laterite">Back to distribution {pot}</Link>}
      </div>
    </main>
  );
}
