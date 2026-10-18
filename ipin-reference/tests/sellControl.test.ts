import { describe, expect, it } from "vitest";
import { sellControl } from "../src/lib/sellControl";

describe("sell control", () => {
  it("slides on mobile", () => {
    expect(sellControl(true)).toBe("slide");
  });
  it("clicks on desktop", () => {
    expect(sellControl(false)).toBe("click");
  });
});
