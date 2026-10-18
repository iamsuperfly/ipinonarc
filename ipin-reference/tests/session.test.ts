import { describe, expect, it } from "vitest";
import { bearerToken } from "../src/lib/session";

describe("wallet session", () => {
  it("reads only a bearer token", () => {
    expect(bearerToken("Bearer abc")).toBe("abc");
    expect(bearerToken("Basic abc")).toBe("");
  });
});
