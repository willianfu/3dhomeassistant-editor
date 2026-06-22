import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { EDITOR_LOCAL_CONFIG_KEY } from "./lib/editor-local-config";
import { defaultHaRuntimeConfig } from "./lib/ha-config";
import { defaultWeather } from "./lib/weather-presets";
import { defaultEnvironment, defaultPerformance } from "./types/editor";

vi.mock("./components/editor/PartsTree", () => ({
  PartsTree: () => <div />,
}));

vi.mock("./components/editor/RightInspector", () => ({
  RightInspector: () => <div />,
}));

vi.mock("./components/editor/Viewport", () => ({
  Viewport: ({ children, previewMode }: { children?: ReactNode; previewMode: boolean }) => (
    <div data-preview-mode={previewMode ? "true" : "false"}>{children}</div>
  ),
}));

vi.mock("./components/editor/TopToolbar", () => ({
  TopToolbar: ({ onTogglePreview }: { onTogglePreview: () => void }) => (
    <button type="button" onClick={onTogglePreview}>
      切换预览
    </button>
  ),
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
    callEntity: vi.fn(),
  }),
}));

describe("App preview regions", () => {
  beforeEach(() => {
    window.localStorage.setItem(
      EDITOR_LOCAL_CONFIG_KEY,
      JSON.stringify({
        version: 1,
        environment: defaultEnvironment,
        performance: defaultPerformance,
        weather: defaultWeather,
        ha: defaultHaRuntimeConfig(),
        regions: [
          {
            id: "region-living",
            name: "客厅",
            points: [
              { x: 0, z: 0 },
              { x: 3, z: 0 },
              { x: 3, z: 3 },
            ],
          },
        ],
        objects: {},
      }),
    );
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("keeps the renderer region list visible in preview mode", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "切换预览" }));

    fireEvent.click(screen.getByRole("button", { name: "客厅" }));

    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.getByText("区域设备")).toBeTruthy();
  });
});
