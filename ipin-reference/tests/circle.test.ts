import { describe, expect, it } from "vitest";
import { circleFailure, circleKey, circleReady } from "../src/lib/circle";

describe("circle session failure", () => {
  it("says when the key was rejected", () => {
    expect(circleFailure(401)).toBe("Circle did not accept the key. Check the test key on this deploy.");
  });
  it("says when the browser was rejected", () => {
    expect(circleFailure(400)).toBe("Circle did not accept this browser. Try again.");
  });
  it("reads either env name", () => {
    expect(circleKey({ TEST_API_KEY: "TEST_API_KEY:abc" })).toBe("TEST_API_KEY:abc");
    expect(circleReady("key", "app")).toBe(true);
  });
});
