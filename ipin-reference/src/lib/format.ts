export function shortAddr(addr?: string) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatUsdc(units: bigint) {
  const n = Number(units) / 1_000_000;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

export function parseUsdc(input: string): bigint {
  const cleaned = input.trim().replace(/,/g, "");
  if (!cleaned) return 0n;
  const [w, f = ""] = cleaned.split(".");
  const frac = (f + "000000").slice(0, 6);
  return BigInt(w || "0") * 1_000_000n + BigInt(frac);
}
