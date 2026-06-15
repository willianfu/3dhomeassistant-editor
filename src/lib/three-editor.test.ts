import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { ThreeEditor } from "./three-editor";

function createEditorLike() {
  const editor = Object.create(ThreeEditor.prototype) as any;
  editor.scene = new THREE.Scene();
  editor.modelRoot = null;
  editor.objectMap = new Map();
  editor.loadObjectFromUrl = vi.fn(async (_url: string, name: string) => {
    const group = new THREE.Group();
    group.name = name;
    return group;
  });
  editor.prepareModel = vi.fn();
  editor.rebuildObjectMap = vi.fn(() => {
    editor.objectMap.clear();
    editor.modelRoot?.traverse((node: THREE.Object3D) => editor.objectMap.set(node.uuid, node));
  });
  editor.frameObject = vi.fn();
  editor.setViewMode = vi.fn();
  editor.rebuildWeatherEffects = vi.fn();
  editor.selectObject = vi.fn();
  editor.history = {
    push: vi.fn(),
    getState: vi.fn(() => ({ canUndo: false, canRedo: false, isDirty: false })),
  };
  editor.options = {
    onModelChange: vi.fn(),
    onHistoryChange: vi.fn(),
    onSelectionChange: vi.fn(),
    onLoadProgress: vi.fn(),
  };
  return editor as ThreeEditor;
}

describe("ThreeEditor additive model loading", () => {
  it("creates a root and adds a model without clearing the existing scene", async () => {
    const editor = createEditorLike();

    const first = await editor.addModelFromUrl("/sample/a.glb", "A");
    const rootAfterFirst = editor.getRoot();
    const second = await editor.addModelFromUrl("/sample/b.glb", "B");
    const rootAfterSecond = editor.getRoot();

    expect(first.name).toBe("A");
    expect(second.name).toBe("B");
    expect(rootAfterFirst).toBe(rootAfterSecond);
    expect(rootAfterFirst?.children).toContain(first);
    expect(rootAfterFirst?.children).toContain(second);
  });
});
