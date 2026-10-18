import { describe, expect, it } from "vitest";
import { formatUsdc, parseUsdc, shortAddr } from "../src/lib/format";

describe("formatUsdc", () => {
  it("formats micro units", () => {
    expect(formatUsdc(1_000_000n)).toContain("1");
    expect(formatUsdc(500_000n)).toContain("0.5");
  });
});

describe("parseUsdc", () => {
  it("parses dollars to 6 decimals", () => {
    expect(parseUsdc("1")).toBe(1_000_000n);
    expect(parseUsdc("1.5")).toBe(1_500_000n);
    expect(parseUsdc("0.000001")).toBe(1n);
  });
});

describe("shortAddr", () => {
  it("truncates", () => {
    expect(shortAddr("0xc28ad0564edf25b517fae206a84063b5a0b2489a")).toBe(
      "0xc28a\u2026489a",
    );
  });
});
