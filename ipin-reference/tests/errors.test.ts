import { describe, expect, it, vi } from "vitest";
import { writeErrorText } from "../src/lib/errors";

describe("writeErrorText", () => {
  it("does not show library text", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(writeErrorText({ shortMessage: "444 error @viem 22.4 does not exist", message: "long" })).toBe(
      "Couldn't finish that. Try again.",
    );
  });
  it("uses a cancel sentence", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(writeErrorText({ shortMessage: "User rejected the request." })).toBe("You cancelled the wallet request.");
  });
  it("uses a balance sentence", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(writeErrorText({ message: "insufficient funds for gas" })).toBe(
      "Couldn't send that. The wallet does not have enough USDC.",
    );
  });
});
