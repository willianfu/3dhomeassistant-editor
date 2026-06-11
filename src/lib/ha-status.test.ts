import { describe, expect, it } from "vitest";
import { canRetryHaConnection } from "./ha-status";

describe("HA status helpers", () => {
  it("allows retrying only when the connection is not active", () => {
    expect(canRetryHaConnection("connected")).toBe(false);
    expect(canRetryHaConnection("connecting")).toBe(false);
    expect(canRetryHaConnection("closed")).toBe(true);
    expect(canRetryHaConnection("error")).toBe(true);
    expect(canRetryHaConnection("not_configured")).toBe(true);
  });
});
