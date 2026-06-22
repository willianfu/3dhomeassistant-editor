import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TopToolbar } from "./TopToolbar";
import { defaultWeather } from "../../lib/weather-presets";
import type { TopToolbarProps } from "./TopToolbar";

function renderToolbar(props: Partial<TopToolbarProps> = {}) {
  const defaultProps: TopToolbarProps = {
    hasModel: false,
    isLoading: false,
    previewMode: false,
    previewCameraMode: "manual",
    leftCollapsed: false,
    rightCollapsed: false,
    viewMode: "perspective",
    historyState: { canUndo: false, canRedo: false, isDirty: false },
    haStatus: "not_configured",
    haStatusMessage: "HA 未配置",
    weather: defaultWeather,
    weatherStatus: null,
    weatherSoundEnabled: false,
    fullscreen: false,
    onUploadClick: vi.fn(),
    onExport: vi.fn(),
    onImportConfigClick: vi.fn(),
    onTogglePreview: vi.fn(),
    onPreviewCameraModeChange: vi.fn(),
    onToggleFullscreen: vi.fn(),
    onRetryHaConnection: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onWeatherChange: vi.fn(),
    onWeatherSoundToggle: vi.fn(),
    onViewModeChange: vi.fn(),
    onToggleLeft: vi.fn(),
    onToggleRight: vi.fn(),
  };

  return render(<TopToolbar {...defaultProps} {...props} />);
}

describe("TopToolbar weather sound", () => {
  it("renders a weather sound toggle next to weather controls", () => {
    const onWeatherSoundToggle = vi.fn();

    renderToolbar({ weatherSoundEnabled: false, onWeatherSoundToggle });

    const weatherButton = screen.getByRole("button", { name: "天气模拟" });
    const soundButton = screen.getByRole("button", { name: "开启天气音效" });

    expect(weatherButton.compareDocumentPosition(soundButton)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    fireEvent.click(soundButton);

    expect(onWeatherSoundToggle).toHaveBeenCalledTimes(1);
  });

  it("uses the sound-off label when weather sound is enabled", () => {
    renderToolbar({ weatherSoundEnabled: true });

    expect(screen.getByRole("button", { name: "关闭天气音效" })).toBeTruthy();
  });
});

describe("TopToolbar brand and author", () => {
  it("shows the compact product title and opens the author popover", () => {
    renderToolbar();

    expect(screen.getByText("3d智家中控")).toBeTruthy();
    expect(screen.queryByText("3D 智能家居主控设计器")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "关于作者" }));

    expect(
      screen.getByText(
        "本软件还在不断开发迭代，或有些许不足，会在日后逐渐完善提供更强的功能和更好的交互体验，也欢迎志同道合的朋友一起交流，微信：willainfu_",
      ),
    ).toBeTruthy();

    const image = screen.getByRole("img", { name: "作者微信二维码" });
    expect(image.getAttribute("src")).toBe("/images/vx.jpg");
  });
});

describe("TopToolbar view modes", () => {
  it("keeps view mode controls compact and removes side view", () => {
    renderToolbar({ hasModel: true });

    expect(screen.getByRole("button", { name: "透视" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "顶视" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "正视" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "侧视" })).toBeNull();
    expect(document.querySelector(".lucide-square-dashed-mouse-pointer")).toBeNull();
  });
});
