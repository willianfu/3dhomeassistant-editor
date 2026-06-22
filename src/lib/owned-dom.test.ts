import { describe, expect, it } from "vitest";
import { removeOwnedElement } from "./owned-dom";

describe("removeOwnedElement", () => {
  it("only removes the element owned by the disposed editor", () => {
    const container = document.createElement("div");
    const oldRenderer = document.createElement("canvas");
    const newRenderer = document.createElement("canvas");
    container.append(oldRenderer, newRenderer);

    removeOwnedElement(container, oldRenderer);

    expect(container.contains(oldRenderer)).toBe(false);
    expect(container.contains(newRenderer)).toBe(true);
  });

  it("does not remove unrelated children when the owned element is already gone", () => {
    const container = document.createElement("div");
    const oldRenderer = document.createElement("canvas");
    const newRenderer = document.createElement("canvas");
    container.append(newRenderer);

    removeOwnedElement(container, oldRenderer);

    expect(container.children).toHaveLength(1);
    expect(container.firstElementChild).toBe(newRenderer);
  });
});
