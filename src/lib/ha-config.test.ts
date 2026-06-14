import { describe, expect, it } from "vitest";
import { defaultHaRuntimeConfig, normalizeHaRuntimeConfig } from "./ha-config";

describe("ha-config", () => {
  it("normalizes config values from user input", () => {
    expect(
      normalizeHaRuntimeConfig({
        apiUrl: "  http://ha.local:8123 ",
        token: "  abc123 ",
      }),
    ).toEqual({
      apiUrl: "http://ha.local:8123",
      token: "abc123",
    });
  });

  it("returns empty config by default", () => {
    expect(defaultHaRuntimeConfig()).toEqual({ apiUrl: "", token: "" });
  });
});
