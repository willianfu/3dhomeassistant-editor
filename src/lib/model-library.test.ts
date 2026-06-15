import { describe, expect, it } from "vitest";
import {
  isSupportedModelFile,
  modelLibraryItems,
  parseModelLibraryDragItem,
  serializeModelLibraryDragItem,
} from "./model-library";

describe("model-library", () => {
  it("exposes mock library items with url and thumbnail metadata", () => {
    expect(modelLibraryItems.length).toBeGreaterThan(0);
    expect(modelLibraryItems[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      category: expect.any(String),
      format: expect.any(String),
      url: expect.any(String),
      thumbnailUrl: expect.any(String),
    });
  });

  it("accepts glb, gltf, and obj files", () => {
    expect(isSupportedModelFile(new File([""], "chair.glb"))).toBe(true);
    expect(isSupportedModelFile(new File([""], "chair.gltf"))).toBe(true);
    expect(isSupportedModelFile(new File([""], "chair.obj"))).toBe(true);
    expect(isSupportedModelFile(new File([""], "chair.fbx"))).toBe(false);
  });

  it("round-trips model library drag payloads", () => {
    const item = modelLibraryItems[0];

    expect(parseModelLibraryDragItem(serializeModelLibraryDragItem(item))).toEqual(item);
    expect(parseModelLibraryDragItem("{")).toBeNull();
    expect(parseModelLibraryDragItem(JSON.stringify({ id: "missing-fields" }))).toBeNull();
  });
});
