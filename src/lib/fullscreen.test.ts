import { describe, expect, it, vi } from "vitest";
import { isFullscreen, toggleFullscreen } from "./fullscreen";

describe("fullscreen helpers", () => {
  it("requests fullscreen when no element is fullscreen", async () => {
    const requestFullscreen = vi.fn();
    const exitFullscreen = vi.fn();
    const target = { requestFullscreen } as unknown as HTMLElement;
    const doc = {
      fullscreenElement: null,
      exitFullscreen,
    } as unknown as Document;

    await toggleFullscreen(target, doc);

    expect(requestFullscreen).toHaveBeenCalledTimes(1);
    expect(exitFullscreen).not.toHaveBeenCalled();
  });

  it("exits fullscreen when an element is already fullscreen", async () => {
    const requestFullscreen = vi.fn();
    const exitFullscreen = vi.fn();
    const target = { requestFullscreen } as unknown as HTMLElement;
    const doc = {
      fullscreenElement: target,
      exitFullscreen,
    } as unknown as Document;

    await toggleFullscreen(target, doc);

    expect(exitFullscreen).toHaveBeenCalledTimes(1);
    expect(requestFullscreen).not.toHaveBeenCalled();
  });

  it("detects fullscreen state from the document", () => {
    expect(
      isFullscreen({ fullscreenElement: null } as unknown as Document),
    ).toBe(false);
    expect(
      isFullscreen({ fullscreenElement: {} } as unknown as Document),
    ).toBe(true);
  });
});
