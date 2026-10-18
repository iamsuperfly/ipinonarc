export type Pending =
  | { kind: "withdraw"; to: string; amount: string }
  | {
      kind: "create";
      name: string;
      contractAddress: string;
      abiFunctionSignature: string;
      abiParameters: unknown[];
    }
  | {
      kind: "fund" | "pay";
      contractAddress: string;
      abiFunctionSignature: string;
      abiParameters: unknown[];
    };

const PENDING = "ipin-circle-pending";

export function arcSession() {
  if (typeof window === "undefined") return { userToken: "", walletId: "" };
  return {
    userToken: window.sessionStorage.getItem("ipin-circle-user") || "",
    walletId: window.localStorage.getItem("ipin-circle-wallet") || "",
  };
}

export function openArcWallet() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("ipin-circle-start"));
}

export function setPending(pending: Pending) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING, JSON.stringify(pending));
}

export function takePending(): Pending | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(PENDING);
  window.sessionStorage.removeItem(PENDING);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Pending;
  } catch {
    return null;
  }
}

export function arcCanSign() {
  const session = arcSession();
  return Boolean(session.userToken && session.walletId);
}
