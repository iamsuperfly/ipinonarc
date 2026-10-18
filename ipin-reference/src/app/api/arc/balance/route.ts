import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { address?: string };
  if (!body.address || !/^0x[a-fA-F0-9]{40}$/.test(body.address)) {
    return NextResponse.json({ error: "Couldn't read the balance." }, { status: 400 });
  }
  const res = await fetch("https://rpc.testnet.arc.network", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [body.address, "latest"] }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.result) {
    return NextResponse.json({ error: "Couldn't read the balance." }, { status: 502 });
  }
  const wei = BigInt(json.result);
  const whole = wei / 10n ** 18n;
  const frac = (wei % 10n ** 18n).toString().padStart(18, "0").slice(0, 2);
  return NextResponse.json({ balance: `${whole}.${frac}` });
}
