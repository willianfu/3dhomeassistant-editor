import { describe, expect, it, vi } from "vitest";
import { withTimeout } from "./with-timeout";

describe("withTimeout", () => {
  it("rejects when an async operation does not settle in time", async () => {
    vi.useFakeTimers();
    const pending = new Promise(() => undefined);
    const result = withTimeout(pending, 100, "timeout");
    const assertion = expect(result).rejects.toThrow("timeout");

    await vi.advanceTimersByTimeAsync(100);

    await assertion;
    vi.useRealTimers();
  });

  it("resolves when the async operation settles before the timeout", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 100, "timeout")).resolves.toBe("ok");
  });
});
