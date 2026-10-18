export type FundStep = "amount" | "short" | "approve" | "fund";

export function nextFundStep(wallet: bigint, amount: bigint, allowance: bigint): FundStep {
  if (amount <= 0n) return "amount";
  if (wallet < amount) return "short";
  if (allowance < amount) return "approve";
  return "fund";
}
