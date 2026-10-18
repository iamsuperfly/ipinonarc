import { describe, expect, it } from "vitest";
import { EURC, USDC, isAllowedToken, tokenSymbol } from "../src/lib/tokens";

describe("tokens", () => {
  it("allows only USDC and EURC", () => {
    expect(isAllowedToken(USDC)).toBe(true);
    expect(isAllowedToken(EURC)).toBe(true);
    expect(isAllowedToken("0x0000000000000000000000000000000000000001")).toBe(false);
  });

  it("labels EURC", () => {
    expect(tokenSymbol(EURC)).toBe("EURC");
    expect(tokenSymbol(USDC)).toBe("USDC");
  });
});
