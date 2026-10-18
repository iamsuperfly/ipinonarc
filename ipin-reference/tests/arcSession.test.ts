import { describe, expect, it } from "vitest";
import { arcCanSign, setPending, takePending } from "../src/lib/arcSession";

describe("arc session", () => {
  it("treats a missing token or wallet id as unable to sign", () => {
    expect(arcCanSign()).toBe(false);
  });

  it("does nothing with a pending send when there is no browser", () => {
    setPending({ kind: "withdraw", to: "0x1", amount: "1" });
    expect(takePending()).toBeNull();
  });
});
