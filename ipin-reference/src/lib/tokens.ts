import { getAddress } from "viem";

export const USDC = "0x3600000000000000000000000000000000000000" as const;
export const EURC = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as const;

export type PotToken = "USDC" | "EURC";

export function tokenAddress(symbol: PotToken) {
  return symbol === "EURC" ? EURC : USDC;
}

export function tokenSymbol(addr?: string): PotToken {
  if (!addr) return "USDC";
  try {
    const a = getAddress(addr);
    if (a === getAddress(EURC)) return "EURC";
  } catch {
    return "USDC";
  }
  return "USDC";
}

export function isAllowedToken(addr: string) {
  try {
    const a = getAddress(addr);
    return a === getAddress(USDC) || a === getAddress(EURC);
  } catch {
    return false;
  }
}
