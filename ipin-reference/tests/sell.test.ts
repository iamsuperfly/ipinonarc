import { describe, expect, it } from "vitest";
import { sellStep } from "../src/lib/sell";

describe("sell routes", () => {
  it("sells USDC from every wired Circle testnet", () => {
    for (const chain of ["eth", "base", "arb", "op", "polygon", "avax"]) {
      expect(sellStep("USDC", chain)).toBe("sell");
    }
  });
  it("does not sell a token with no route", () => {
    expect(sellStep("ETH", "base")).toBe("no-route");
    expect(sellStep("USDC", "solana")).toBe("no-route");
  });
});
