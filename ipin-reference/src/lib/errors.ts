export function writeErrorText(error: unknown) {
  if (!error) return "";
  const raw = rawText(error);
  if (raw) console.error(raw);
  return plain(raw);
}

function rawText(error: unknown) {
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null) {
    const rec = error as { shortMessage?: string; message?: string; details?: string };
    return rec.shortMessage || rec.details || rec.message || "";
  }
  return String(error);
}

function plain(raw: string) {
  const text = raw.toLowerCase();
  if (!text) return "Couldn't finish that. Try again.";
  if (text.includes("user rejected") || text.includes("user denied") || text.includes("rejected the request")) {
    return "You cancelled the wallet request.";
  }
  if (text.includes("insufficient") || text.includes("exceeds balance")) {
    return "Couldn't send that. The wallet does not have enough USDC.";
  }
  if (text.includes("already paid") || text.includes("alreadypaid")) {
    return "That person was already paid.";
  }
  if (text.includes("not owner") || text.includes("notowner")) {
    return "Only the person who created this distribution can do that.";
  }
  if (text.includes("chain") || text.includes("network")) {
    return "Couldn't reach Arc. Switch the wallet to Arc testnet and try again.";
  }
  return "Couldn't finish that. Try again.";
}
