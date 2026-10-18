export type SellStep = "fund" | "sell" | "no-route";

const ROUTES = new Set(["eth", "base", "arb", "op", "polygon", "avax"]);

export function sellStep(asset: string, chain: string): SellStep {
  if (asset === "USDC" && chain === "arc") return "fund";
  if (asset === "USDC" && ROUTES.has(chain)) return "sell";
  return "no-route";
}
