import { describe, expect, it } from "vitest";
import { nextFundStep } from "../src/lib/fund";

describe("fund only calls the chain when the wallet can pay", () => {
  it("asks for an amount before any wallet call", () => {
    expect(nextFundStep(5_000_000n, 0n, 0n)).toBe("amount");
  });
  it("stops when Arc USDC is short", () => {
    expect(nextFundStep(1_000_000n, 5_000_000n, 0n)).toBe("short");
  });
  it("approves before fund when allowance is missing", () => {
    expect(nextFundStep(5_000_000n, 5_000_000n, 0n)).toBe("approve");
    expect(nextFundStep(5_000_000n, 5_000_000n, 4_999_999n)).toBe("approve");
  });
  it("funds only after the contract is allowed to pull USDC", () => {
    expect(nextFundStep(5_000_000n, 5_000_000n, 5_000_000n)).toBe("fund");
    expect(nextFundStep(9_000_000n, 5_000_000n, 5_000_000n)).toBe("fund");
  });
});
