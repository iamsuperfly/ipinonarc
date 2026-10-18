"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isAddress } from "viem";
import { openArcWallet, setPending, takePending } from "@/lib/arcSession";
import { CIRCLE_APP_ID } from "@/lib/circle";
import { supabaseBrowser } from "@/lib/supabase";
import { W3SSdk } from "@circle-fin/w3s-pw-web-sdk";

const GOOGLE_CLIENT_ID = "12931803157-318qbgo8ijiqionm6hd22ofm4qvsl41l.apps.googleusercontent.com";
const APP_ID = process.env.NEXT_PUBLIC_CIRCLE_APP_ID || CIRCLE_APP_ID;
const FAUCET = "https://faucet.circle.com";

type WalletState = { note: string; address: string; balance: string; busy: boolean };
const listeners = new Set<(state: WalletState) => void>();
let state: WalletState = {
  note: "An Arc wallet is separate from the connected wallet.",
  address: "",
  balance: "",
  busy: false,
};

function publish(next: Partial<WalletState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener(state));
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=600; samesite=lax`;
}

function getCookie(name: string) {
  const hit = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : "";
}

function googleConfig() {
  return {
    clientId: getCookie("google.clientId") || GOOGLE_CLIENT_ID,
    redirectUri: window.location.origin,
    selectAccountPrompt: true,
  };
}

function sdkError(error: unknown) {
  if (!error) return "Circle returned no login result.";
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  const value = error as { message?: string; code?: string | number; error?: string };
  const message = value.message || value.error;
  if (message && value.code) return `${value.code}: ${message}`;
  if (message) return message;
  try {
    return JSON.stringify(error);
  } catch {
    return "Circle returned an unreadable login error.";
  }
}

function challengeResult(result: unknown) {
  const value = result as { status?: string; type?: string } | null;
  if (!value) return "Arc wallet confirmed.";
  if (value.status === "FAILED" || value.status === "EXPIRED") return "The Arc wallet did not finish. Try again.";
  return "Arc wallet confirmed.";
}

function storedAuth() {
  return {
    userToken: window.sessionStorage.getItem("ipin-circle-user") || "",
    encryptionKey: window.sessionStorage.getItem("ipin-circle-key") || "",
  };
}

function rememberAuth(userToken: string, encryptionKey: string) {
  window.sessionStorage.setItem("ipin-circle-user", userToken);
  window.sessionStorage.setItem("ipin-circle-key", encryptionKey);
}

async function authHeaders() {
  const supabase = supabaseBrowser();
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  if (!session?.access_token) return null;
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
}

async function saveCircle(address: string) {
  const supabase = supabaseBrowser();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) return "Sign in before saving the wallet.";
  await supabase.from("wallets").update({ is_active: false }).eq("account_id", user.id);
  const saved = await supabase.from("wallets").upsert(
    { account_id: user.id, address: address.toLowerCase(), is_active: true, kind: "circle" },
    { onConflict: "account_id,address" },
  );
  if (saved.error) return "Couldn't save the Arc wallet. Run the new schema, then try again.";
  window.localStorage.setItem("ipin-circle-address", address);
  return "";
}

async function readBalance(address: string) {
  const res = await fetch("/api/arc/balance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  const json = await res.json().catch(() => ({}));
  return res.ok ? String(json.balance || "0.00") : "";
}

export function CircleHost() {
  const router = useRouter();
  const sdkRef = useRef<W3SSdk | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("ipin-circle-address") || "";
    if (saved) {
      publish({ address: saved, note: "Arc wallet ready." });
      void readBalance(saved).then((balance) => publish({ balance }));
    }
    const sdk = new W3SSdk(
      {
        appSettings: { appId: getCookie("appId") || APP_ID },
        loginConfigs: {
          deviceToken: getCookie("deviceToken"),
          deviceEncryptionKey: getCookie("deviceEncryptionKey"),
          google: googleConfig(),
        },
      },
      (error, result) => {
        if (error || !result || !("userToken" in result) || !result.encryptionKey) {
          publish({ note: sdkError(error), busy: false });
          return;
        }
        rememberAuth(result.userToken, result.encryptionKey);
        sdk.setAuthentication({ userToken: result.userToken, encryptionKey: result.encryptionKey });
        router.replace("/account");
        publish({ note: "Google confirmed. Creating the Arc wallet.", busy: true });
        void createWallet(sdk, result.userToken, result.encryptionKey);
      },
    );
    sdkRef.current = sdk;
    window.localStorage.setItem("ipin-circle-ready", "1");
    // Establish the Circle iframe session early so later execute calls work.
    void sdk.getDeviceId().catch(() => undefined);
  }, [router]);

  async function runChallenge(sdk: W3SSdk, challengeId: string) {
    const auth = storedAuth();
    if (!auth.userToken || !auth.encryptionKey) {
      publish({ note: "Open the Arc wallet once so it can sign.", busy: false });
      window.dispatchEvent(new CustomEvent("ipin-circle-result", { detail: { ok: false, note: "Open the Arc wallet once so it can sign." } }));
      return;
    }
    try {
      // Must open the device session or execute fails silently.
      await sdk.getDeviceId();
    } catch {
      publish({ note: "Couldn't reach Circle. Try again.", busy: false });
      window.dispatchEvent(new CustomEvent("ipin-circle-result", { detail: { ok: false, note: "Couldn't reach Circle. Try again." } }));
      return;
    }
    sdk.setAuthentication(auth);
    publish({ note: "Confirm in the Arc wallet.", busy: true });
    sdk.execute(challengeId, async (challengeError, result) => {
      if (challengeError) {
        const note = sdkError(challengeError);
        publish({ note, busy: false });
        window.dispatchEvent(new CustomEvent("ipin-circle-result", { detail: { ok: false, note } }));
        return;
      }
      const address = window.localStorage.getItem("ipin-circle-address") || "";
      const balance = address ? await readBalance(address) : "";
      const note = challengeResult(result);
      publish({ balance, note, busy: false });
      window.dispatchEvent(new CustomEvent("ipin-circle-result", { detail: { ok: true, note, result } }));
    });
  }

  async function listed(headers: Record<string, string>, userToken: string) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const listedWallet = await fetch("/api/circle/wallet", {
        method: "POST",
        headers,
        body: JSON.stringify({ userToken }),
      });
      const json = await listedWallet.json().catch(() => ({}));
      if (json.address) {
        if (json.walletId) window.localStorage.setItem("ipin-circle-wallet", json.walletId);
        return { address: json.address as string, walletId: (json.walletId as string) || "" };
      }
      if (json.challengeId) return { address: "", walletId: "" };
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
    }
    return { address: "", walletId: "" };
  }

  async function resume(sdk: W3SSdk, userToken: string, walletId: string) {
    const pending = takePending();
    if (!pending || !walletId) return;
    const headers = await authHeaders();
    if (!headers) return;
    const body = pending.kind === "withdraw"
      ? { kind: "transfer", userToken, walletId, to: pending.to, amount: pending.amount }
      : {
          kind: "contract",
          userToken,
          walletId,
          contractAddress: pending.contractAddress,
          abiFunctionSignature: pending.abiFunctionSignature,
          abiParameters: pending.abiParameters,
        };
    const created = await fetch("/api/circle/tx", { method: "POST", headers, body: JSON.stringify(body) });
    const json = await created.json().catch(() => ({}));
    if (!created.ok || !json.challengeId) {
      publish({ note: json.error || "Couldn't ask the Arc wallet to sign.", busy: false });
      return;
    }
    await runChallenge(sdk, json.challengeId);
  }

  async function finish(sdk: W3SSdk, address: string, userToken: string, walletId: string) {
    const failed = await saveCircle(address);
    const balance = await readBalance(address);
    publish({ address, balance, note: failed || "Arc wallet ready.", busy: false });
    router.replace("/account");
    if (walletId) await resume(sdk, userToken, walletId);
  }

  async function createWallet(sdk: W3SSdk, userToken: string, encryptionKey: string) {
    const headers = await authHeaders();
    if (!headers) {
      publish({ note: "Sign in before creating a wallet.", busy: false });
      return;
    }
    const created = await fetch("/api/circle/wallet", {
      method: "POST",
      headers,
      body: JSON.stringify({ userToken }),
    });
    const json = await created.json().catch(() => ({}));
    if (json.walletId) window.localStorage.setItem("ipin-circle-wallet", json.walletId);
    if (json.address) {
      await finish(sdk, json.address, userToken, json.walletId || "");
      return;
    }
    if (!json.challengeId) {
      publish({ note: json.error || "Circle has not created the wallet yet.", busy: false });
      return;
    }
    sdk.setAuthentication({ userToken, encryptionKey });
    publish({ note: "Confirm the wallet prompt." });
    sdk.execute(json.challengeId, async (challengeError) => {
      if (challengeError) {
        publish({ note: sdkError(challengeError), busy: false });
        return;
      }
      const found = await listed(headers, userToken);
      if (!found.address) {
        publish({ note: "Circle confirmed Google, but no Arc address exists yet.", busy: false });
        return;
      }
      await finish(sdk, found.address, userToken, found.walletId);
    });
  }

  useEffect(() => {
    const start = async () => {
      const sdk = sdkRef.current;
      if (!sdk) return;
      publish({ note: "Starting the Arc wallet.", busy: true });
      const headers = await authHeaders();
      if (!headers) {
        publish({ note: "Sign in before starting a wallet.", busy: false });
        return;
      }
      try {
        const deviceId = window.localStorage.getItem("deviceId") || (await sdk.getDeviceId());
        window.localStorage.setItem("deviceId", deviceId);
        const session = await fetch("/api/circle/session", {
          method: "POST",
          headers,
          body: JSON.stringify({ deviceId, idempotencyKey: crypto.randomUUID() }),
        });
        const sessionJson = await session.json().catch(() => ({}));
        if (!session.ok || !sessionJson.deviceToken || !sessionJson.deviceEncryptionKey) {
          publish({ note: sessionJson.error || "Couldn't reach Circle. Try again.", busy: false });
          return;
        }
        setCookie("appId", APP_ID);
        setCookie("google.clientId", GOOGLE_CLIENT_ID);
        setCookie("deviceToken", sessionJson.deviceToken);
        setCookie("deviceEncryptionKey", sessionJson.deviceEncryptionKey);
        sdk.updateConfigs({
          appSettings: { appId: APP_ID },
          loginConfigs: {
            deviceToken: sessionJson.deviceToken,
            deviceEncryptionKey: sessionJson.deviceEncryptionKey,
            google: googleConfig(),
          },
        });
        publish({ note: "Choose the Google account. You will come back here." });
        await sdk.performLogin("Google" as Parameters<W3SSdk["performLogin"]>[0]);
      } catch (error) {
        publish({ note: sdkError(error), busy: false });
      }
    };
    const onStart = () => void start();
    const onExec = (event: Event) => {
      const sdk = sdkRef.current;
      const challengeId = (event as CustomEvent<string>).detail;
      if (!sdk || !challengeId) return;
      void runChallenge(sdk, challengeId);
    };
    window.addEventListener("ipin-circle-start", onStart);
    window.addEventListener("ipin-circle-exec", onExec);
    return () => {
      window.removeEventListener("ipin-circle-start", onStart);
      window.removeEventListener("ipin-circle-exec", onExec);
    };
  }, []);

  return null;
}

export function CircleCard() {
  const [local, setLocal] = useState(state);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    setLocal(state);
    listeners.add(setLocal);
    return () => {
      listeners.delete(setLocal);
    };
  }, []);

  async function copy() {
    if (!local.address) return;
    await navigator.clipboard.writeText(local.address).catch(() => undefined);
    publish({ note: "Address copied." });
  }

  async function withdraw() {
    if (!isAddress(to) || !amount) {
      publish({ note: "Enter an address and an amount." });
      return;
    }
    const userToken = window.sessionStorage.getItem("ipin-circle-user") || "";
    const encryptionKey = window.sessionStorage.getItem("ipin-circle-key") || "";
    const walletId = window.localStorage.getItem("ipin-circle-wallet") || "";
    const headers = await authHeaders();
    if (!headers || !userToken || !encryptionKey || !walletId) {
      setPending({ kind: "withdraw", to, amount });
      openArcWallet();
      publish({ note: "Opening the Arc wallet. It will ask you to confirm the send after." });
      return;
    }
    const created = await fetch("/api/circle/tx", {
      method: "POST",
      headers,
      body: JSON.stringify({ kind: "transfer", userToken, walletId, to, amount }),
    });
    const json = await created.json().catch(() => ({}));
    if (!created.ok || !json.challengeId) {
      publish({ note: json.error || "Couldn't send from the Arc wallet." });
      return;
    }
    publish({ note: "Confirm the send in the Arc wallet." });
    window.dispatchEvent(new CustomEvent("ipin-circle-exec", { detail: json.challengeId }));
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-panel px-4 py-4">
      <p className="text-sm text-mute">{local.note}</p>
      {local.address && (
        <button type="button" className="mt-2 break-all text-left font-mono text-sm" onClick={copy}>
          {local.address}
        </button>
      )}
      {local.address && <p className="mt-2 text-sm">{local.balance ? `${local.balance} USDC` : "Reading balance."}</p>}
      {local.address ? (
        <>
          <a className="btn-ghost mt-3 block text-center" href={FAUCET} target="_blank" rel="noreferrer">Fund</a>
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Withdraw to 0x" className="mt-3 h-12 w-full rounded-2xl border border-ink/15 bg-ground px-4 font-mono text-sm outline-none focus:border-laterite" />
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="mt-3 h-12 w-full rounded-2xl border border-ink/15 bg-ground px-4 font-mono outline-none focus:border-laterite" />
          <button type="button" className="btn-primary mt-3 w-full" onClick={withdraw}>Withdraw</button>
        </>
      ) : (
        <button type="button" className="btn-primary mt-3 w-full" disabled={local.busy} onClick={() => window.dispatchEvent(new Event("ipin-circle-start"))}>
          {local.busy ? "Starting" : "Start"}
        </button>
      )}
    </div>
  );
}
