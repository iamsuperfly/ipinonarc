import { NextResponse } from "next/server";
import { circleHost, circleKey, circleReady } from "@/lib/circle";
import { signedIn } from "@/lib/session";

export const dynamic = "force-dynamic";

function arcWallet(wallets: { id?: string; blockchain?: string; address?: string }[] | undefined) {
  const rows = wallets ?? [];
  return rows.find((wallet) => String(wallet.blockchain || "").toUpperCase().includes("ARC") && wallet.address) || rows.find((wallet) => wallet.address);
}

export async function POST(request: Request) {
  if (!(await signedIn(request))) {
    return NextResponse.json({ error: "Sign in before creating a wallet." }, { status: 401 });
  }
  const apiKey = circleKey(process.env);
  if (!circleReady(apiKey, "app")) {
    return NextResponse.json({ error: "Circle is not ready on this deploy yet." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { userToken?: string };
  if (!body.userToken) {
    return NextResponse.json({ error: "Couldn't create the Arc wallet. Try again." }, { status: 400 });
  }
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "X-User-Token": body.userToken,
  };
  const existing = await fetch(`${circleHost(apiKey)}/v1/w3s/wallets`, { headers });
  const existingJson = await existing.json().catch(() => ({}));
  const found = arcWallet(existingJson.data?.wallets);
  if (found?.address) return NextResponse.json({ address: found.address, walletId: found.id || "" });
  const initialized = await fetch(`${circleHost(apiKey)}/v1/w3s/user/initialize`, {
    method: "POST",
    headers,
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), accountType: "SCA", blockchains: ["ARC-TESTNET"] }),
  });
  const initializedJson = await initialized.json().catch(() => ({}));
  if (initializedJson.code === 155106) return NextResponse.json({ address: "" });
  if (!initialized.ok || !initializedJson.data?.challengeId) {
    return NextResponse.json({ error: "Couldn't create the Arc wallet. Try again." }, { status: 502 });
  }
  return NextResponse.json({ challengeId: initializedJson.data.challengeId });
}
