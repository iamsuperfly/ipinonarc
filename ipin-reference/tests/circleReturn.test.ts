import { describe, expect, it } from "vitest";
import { circleErrorMessage, circleReturn } from "../src/lib/circleReturn";

describe("circle return", () => {
  it("names a rejected return address", () => {
    expect(circleErrorMessage("?error=redirect_uri_mismatch", "")).toBe("Google rejected the profile return address.");
  });
  it("keeps a code separate from an error", () => {
    expect(circleReturn("?code=abc", "")).toBe("code");
  });
});
