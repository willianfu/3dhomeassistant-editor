import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./components/editor/PartsTree", () => ({
  PartsTree: () => <div />,
}));

vi.mock("./components/editor/RightInspector", () => ({
  RightInspector: () => <div />,
}));

vi.mock("./components/editor/Viewport", () => ({
  Viewport: () => <div />,
}));

vi.mock("./components/editor/HaBindingDialog", () => ({
  HaBindingDialog: () => null,
}));

vi.mock("./components/editor/HaFloatingPanel", () => ({
  HaFloatingPanel: () => null,
}));

vi.mock("./hooks/useHomeAssistant", () => ({
  useHomeAssistant: () => ({
    status: "not_configured",
    statusMessage: "HA 未配置",
    retryConnection: vi.fn(),
    states: {},
    callService: vi.fn(),
  }),
}));

describe("App weather sound", () => {
  const originalAudio = globalThis.Audio;
  const audioInstances: unknown[] = [];

  beforeEach(() => {
    audioInstances.length = 0;
    class FakeAudio {
      loop = false;
      src = "";
      currentTime = 0;
      play = vi.fn(() => Promise.resolve());
      pause = vi.fn();

      constructor() {
        audioInstances.push(this);
      }
    }

    globalThis.Audio = FakeAudio as unknown as typeof Audio;
  });

  afterEach(() => {
    globalThis.Audio = originalAudio;
  });

  it("does not set an app-specific audio volume", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "开启天气音效" }));
    fireEvent.click(screen.getByRole("button", { name: "天气模拟" }));
    fireEvent.click(await screen.findByRole("button", { name: "中雨" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "关闭天气音效" })).toBeTruthy();
    });

    expect((audioInstances[0] as { volume?: number } | undefined)?.volume).toBeUndefined();
  });
});
