import { NextResponse } from "next/server";
import { circleFailure, circleHost, circleKey, circleReady } from "@/lib/circle";
import { signedIn } from "@/lib/session";

export const dynamic = "force-dynamic";

function plain(message: string) {
  if (/cannot find target wallet/i.test(message)) return "The Arc wallet is not ready. Open it once, then try again.";
  return message;
}

export async function POST(request: Request) {
  if (!(await signedIn(request))) {
    return NextResponse.json({ error: "Sign in before the Arc wallet can sign." }, { status: 401 });
  }
  const apiKey = circleKey(process.env);
  if (!circleReady(apiKey, "app")) {
    return NextResponse.json({ error: "Circle is not ready on this deploy yet." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    userToken?: string;
    walletId?: string;
    kind?: "contract" | "transfer" | "status";
    contractAddress?: string;
    callData?: string;
    abiFunctionSignature?: string;
    abiParameters?: unknown[];
    to?: string;
    amount?: string;
  };
  if (!body.userToken || !body.walletId) {
    return NextResponse.json({ error: "Open the Arc wallet once so it can sign." }, { status: 400 });
  }
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "X-User-Token": body.userToken,
  };
  if (body.kind === "status") {
    const listed = await fetch(`${circleHost(apiKey)}/v1/w3s/transactions?walletIds=${body.walletId}&operation=CONTRACT_EXECUTION&pageSize=5&order=DESC`, {
      headers: { Authorization: `Bearer ${apiKey}`, "X-User-Token": body.userToken },
    });
    const json = await listed.json().catch(() => ({}));
    const tx = Array.isArray(json.data?.transactions) ? json.data.transactions[0] : null;
    return NextResponse.json({ hash: tx?.txHash || "", state: tx?.state || "" });
  }
  const path = body.kind === "transfer" ? "transfer" : "contractExecution";
  const contract = body.abiFunctionSignature
    ? {
        idempotencyKey: crypto.randomUUID(),
        walletId: body.walletId,
        contractAddress: body.contractAddress,
        abiFunctionSignature: body.abiFunctionSignature,
        abiParameters: body.abiParameters,
        feeLevel: "MEDIUM",
      }
    : {
        idempotencyKey: crypto.randomUUID(),
        walletId: body.walletId,
        contractAddress: body.contractAddress,
        callData: body.callData,
        feeLevel: "MEDIUM",
      };
  const payload = body.kind === "transfer"
    ? {
        idempotencyKey: crypto.randomUUID(),
        walletId: body.walletId,
        destinationAddress: body.to,
        amounts: [body.amount || "0"],
        tokenAddress: "0x3600000000000000000000000000000000000000",
        blockchain: "ARC-TESTNET",
        feeLevel: "MEDIUM",
      }
    : contract;
  const created = await fetch(`${circleHost(apiKey)}/v1/w3s/user/transactions/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const json = await created.json().catch(() => ({}));
  if (!created.ok || !json.data?.challengeId) {
    return NextResponse.json({ error: plain(json.message || circleFailure(created.status)) }, { status: 502 });
  }
  return NextResponse.json({ challengeId: json.data.challengeId });
}
