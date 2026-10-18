export const FREE_ALLOWANCE = 499_000_000n;
export const FEE_BPS = 25n;
export const FEE_WALLET = "0xc28ad0564edf25b517fae206a84063b5a0b2489a" as const;

export function quoteFee(volumeSoFar: bigint, distribution: bigint) {
  const safeVolume = volumeSoFar < 0n ? 0n : volumeSoFar;
  const safeDist = distribution < 0n ? 0n : distribution;
  const remaining = FREE_ALLOWANCE > safeVolume ? FREE_ALLOWANCE - safeVolume : 0n;
  const taxable = safeDist > remaining ? safeDist - remaining : 0n;
  const fee = (taxable * FEE_BPS) / 10_000n;
  return { remaining, taxable, fee, organizerPays: safeDist + fee };
}
