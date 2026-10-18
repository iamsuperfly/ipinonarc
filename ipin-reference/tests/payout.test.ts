import { describe, expect, it } from "vitest";

function cut(pool: bigint, share: bigint, total: bigint) {
  return (pool * share) / total;
}

describe("payout math matches the contract", () => {
  it("splits 1 USDC 50/50", () => {
    expect(cut(1_000_000n, 50n, 100n)).toBe(500_000n);
  });
  it("splits 1 USDC 70/30", () => {
    expect(cut(1_000_000n, 70n, 100n)).toBe(700_000n);
    expect(cut(1_000_000n, 30n, 100n)).toBe(300_000n);
  });
  it("keeps dust in the pot", () => {
    const pool = 100n;
    const a = cut(pool, 1n, 3n);
    const b = cut(pool, 1n, 3n);
    const c = cut(pool, 1n, 3n);
    expect(a + b + c).toBe(99n);
  });
});
