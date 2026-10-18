import { NextResponse } from "next/server";
import { CIRCLE_APP_ID, circleFailure, circleHost, circleKey, circleReady, socialTokenBody } from "@/lib/circle";
import { signedIn } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await signedIn(request))) {
    return NextResponse.json({ error: "Sign in before starting a wallet." }, { status: 401 });
  }
  const apiKey = circleKey(process.env);
  const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID || CIRCLE_APP_ID;
  if (!circleReady(apiKey, appId)) {
    return NextResponse.json({ error: "Circle is not ready on this deploy yet." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { deviceId?: string; idempotencyKey?: string };
  if (!body.deviceId || !body.idempotencyKey) {
    return NextResponse.json({ error: "Couldn't start the wallet. Try again." }, { status: 400 });
  }
  const res = await fetch(`${circleHost(apiKey)}/v1/w3s/users/social/token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(socialTokenBody(body.deviceId, body.idempotencyKey)),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json({ error: circleFailure(res.status) }, { status: 502 });
  }
  if (!json.data?.deviceToken) {
    return NextResponse.json({ error: "Circle did not return a session. Try again." }, { status: 502 });
  }
  return NextResponse.json({ appId, deviceToken: json.data.deviceToken, deviceEncryptionKey: json.data.deviceEncryptionKey });
}
