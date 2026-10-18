import { describe, expect, it } from "vitest";
import { quoteFee } from "../src/lib/fee";

describe("quoteFee", () => {
  it("is free inside the allowance", () => {
    const q = quoteFee(0n, 100_000_000n);
    expect(q.fee).toBe(0n);
    expect(q.organizerPays).toBe(100_000_000n);
  });

  it("charges 0.25% only above 499", () => {
    const q = quoteFee(0n, 500_000_000n);
    expect(q.taxable).toBe(1_000_000n);
    expect(q.fee).toBe(2_500n);
    expect(q.organizerPays).toBe(500_002_500n);
  });

  it("uses the account volume, not a fresh wallet", () => {
    const q = quoteFee(400_000_000n, 200_000_000n);
    expect(q.taxable).toBe(101_000_000n);
    expect(q.fee).toBe(252_500n);
  });

  it("does not skim recipients when allowance is spent", () => {
    const dist = 25_000_000_000n;
    const q = quoteFee(499_000_000n, dist);
    expect(q.fee).toBe(62_500_000n);
    expect(q.organizerPays - q.fee).toBe(dist);
  });
});
