import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";

vi.mock("three/webgpu", () => ({
  WebGPURenderer: class WebGPURenderer {},
}));

import { ThreeEditor } from "./three-editor";
import {
  getObjectRegionAssignment,
  setObjectBindings,
  setObjectRegionAssignment,
} from "./model-identity";
import type { EditorRegion } from "../types/editor";

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

describe("ThreeEditor realistic rendering lifecycle", () => {
  it("restores lightweight materials when realistic rendering is disabled", () => {
    const editor = Object.create(ThreeEditor.prototype) as any;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ name: "window glass" }),
    );
    mesh.name = "Window_Glass";
    const root = new THREE.Group();
    root.add(mesh);
    const originalMaterial = mesh.material;

    editor.scene = new THREE.Scene();
    editor.modelRoot = root;
    editor.generatedEnvironmentMap = null;
    editor.realisticOriginalMaterials = new Map();
    editor.performanceConfig = {
      renderBackend: "webgl",
      quality: "high",
      realisticRenderingEnabled: true,
    };
    editor.directional = new THREE.DirectionalLight();
    editor.applyStudioEnvironment = vi.fn();
    editor.clearStudioEnvironment = vi.fn();

    editor.updateRealisticRendering();

    expect(mesh.material).not.toBe(originalMaterial);
    expect((mesh.material as THREE.Material).userData.realisticEnhanced).toBe(true);

    editor.performanceConfig.realisticRenderingEnabled = false;
    editor.updateRealisticRendering();

    expect(mesh.material).toBe(originalMaterial);
    expect((mesh.material as THREE.Material).userData.realisticEnhanced).toBeUndefined();
  });
});

describe("ThreeEditor regions", () => {
  it("collects bound object controls inside a polygon region", () => {
    const editor = Object.create(ThreeEditor.prototype) as any;
    const root = new THREE.Group();
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    lamp.name = "客厅灯模型";
    lamp.position.set(1, 0.5, 1);
    const outside = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    outside.name = "卧室灯模型";
    outside.position.set(8, 0.5, 8);
    root.add(lamp, outside);
    setObjectBindings(lamp, [{ type: "entity", entityId: "light.living_room" }]);
    setObjectBindings(outside, [{ type: "entity", entityId: "light.bedroom" }]);
    editor.modelRoot = root;
    editor.objectMap = new Map([
      [lamp.uuid, lamp],
      [outside.uuid, outside],
    ]);

    const region: EditorRegion = {
      id: "region-living",
      name: "客厅",
      points: [
        { x: 0, z: 0 },
        { x: 3, z: 0 },
        { x: 3, z: 3 },
        { x: 0, z: 3 },
      ],
    };

    expect(editor.getRegionDevicePanelItems(region)).toMatchObject([
      {
        id: lamp.uuid,
        name: "客厅灯模型",
        objectIds: [lamp.uuid],
        bindings: [{ type: "entity", entityId: "light.living_room" }],
      },
    ]);
  });

  it("uses object position instead of geometry bounds when auto assigning devices to regions", () => {
    const editor = Object.create(ThreeEditor.prototype) as any;
    const root = new THREE.Group();
    const shiftedGeometryLamp = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    shiftedGeometryLamp.name = "走廊灯模型";
    shiftedGeometryLamp.position.set(8, 0, 8);
    shiftedGeometryLamp.geometry.translate(-7, 0, -7);
    root.add(shiftedGeometryLamp);
    setObjectBindings(shiftedGeometryLamp, [
      { type: "entity", entityId: "light.hallway" },
    ]);
    editor.modelRoot = root;
    editor.objectMap = new Map([[shiftedGeometryLamp.uuid, shiftedGeometryLamp]]);
    editor.regions = [
      {
        id: "region-living",
        name: "客厅",
        points: [
          { x: 0, z: 0 },
          { x: 3, z: 0 },
          { x: 3, z: 3 },
          { x: 0, z: 3 },
        ],
      },
    ];

    expect(editor.getRegionDevicePanelItems(editor.regions[0])).toEqual([]);
  });

  it("honors manual object region assignment before auto position matching", () => {
    const editor = Object.create(ThreeEditor.prototype) as any;
    const root = new THREE.Group();
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    lamp.name = "客厅灯模型";
    lamp.position.set(1, 0, 1);
    root.add(lamp);
    setObjectBindings(lamp, [{ type: "entity", entityId: "light.living_room" }]);
    setObjectRegionAssignment(lamp, {
      mode: "manual",
      regionId: "region-bedroom",
    });
    editor.modelRoot = root;
    editor.objectMap = new Map([[lamp.uuid, lamp]]);
    editor.regions = [
      {
        id: "region-living",
        name: "客厅",
        points: [
          { x: 0, z: 0 },
          { x: 3, z: 0 },
          { x: 3, z: 3 },
          { x: 0, z: 3 },
        ],
      },
      {
        id: "region-bedroom",
        name: "卧室",
        points: [
          { x: 6, z: 0 },
          { x: 9, z: 0 },
          { x: 9, z: 3 },
          { x: 6, z: 3 },
        ],
      },
    ];

    expect(editor.getRegionDevicePanelItems(editor.regions[0])).toEqual([]);
    expect(editor.getRegionDevicePanelItems(editor.regions[1])).toMatchObject([
      { id: lamp.uuid },
    ]);
  });

  it("auto assigns an unset object once and keeps that region after the object moves", () => {
    const editor = Object.create(ThreeEditor.prototype) as any;
    const root = new THREE.Group();
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    lamp.position.set(1, 0, 1);
    root.add(lamp);
    setObjectBindings(lamp, [{ type: "entity", entityId: "light.living_room" }]);
    editor.modelRoot = root;
    editor.objectMap = new Map([[lamp.uuid, lamp]]);
    editor.regions = [
      {
        id: "region-living",
        name: "客厅",
        points: [
          { x: 0, z: 0 },
          { x: 3, z: 0 },
          { x: 3, z: 3 },
          { x: 0, z: 3 },
        ],
      },
      {
        id: "region-bedroom",
        name: "卧室",
        points: [
          { x: 6, z: 0 },
          { x: 9, z: 0 },
          { x: 9, z: 3 },
          { x: 6, z: 3 },
        ],
      },
    ];

    expect(editor.getRegionDevicePanelItems(editor.regions[0])).toMatchObject([
      { id: lamp.uuid },
    ]);
    lamp.position.set(7, 0, 1);

    expect(editor.getRegionDevicePanelItems(editor.regions[0])).toMatchObject([
      { id: lamp.uuid },
    ]);
    expect(getObjectRegionAssignment(lamp)).toMatchObject({
      mode: "auto",
      regionId: "region-living",
      initialized: true,
    });
  });

  it("falls back to auto assignment when a manual region was deleted", () => {
    const editor = Object.create(ThreeEditor.prototype) as any;
    const root = new THREE.Group();
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    lamp.position.set(1, 0, 1);
    root.add(lamp);
    setObjectBindings(lamp, [{ type: "entity", entityId: "light.living_room" }]);
    setObjectRegionAssignment(lamp, {
      mode: "manual",
      regionId: "region-deleted",
    });
    editor.modelRoot = root;
    editor.objectMap = new Map([[lamp.uuid, lamp]]);
    editor.regions = [
      {
        id: "region-living",
        name: "客厅",
        points: [
          { x: 0, z: 0 },
          { x: 3, z: 0 },
          { x: 3, z: 3 },
          { x: 0, z: 3 },
        ],
      },
    ];

    expect(editor.getRegionDevicePanelItems(editor.regions[0])).toMatchObject([
      { id: lamp.uuid },
    ]);
    expect(getObjectRegionAssignment(lamp)).toMatchObject({
      mode: "auto",
      regionId: "region-living",
    });
  });

  it("starts a camera transition when focusing a polygon region", () => {
    const editor = Object.create(ThreeEditor.prototype) as any;
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(0, 5, 10);
    const controls = {
      target: new THREE.Vector3(10, 0, 10),
      update: vi.fn(),
    };
    const region: EditorRegion = {
      id: "region-living",
      name: "客厅",
      points: [
        { x: 0, z: 0 },
        { x: 4, z: 0 },
        { x: 4, z: 2 },
        { x: 0, z: 2 },
      ],
    };
    editor.camera = camera;
    editor.controls = controls;
    editor.viewMode = "perspective";
    editor.regions = [region];
    editor.selectedRegionId = null;
    editor.rebuildRegionObjects = vi.fn();

    expect(editor.focusRegion("region-living")).toBe(true);

    expect(editor.selectedRegionId).toBe("region-living");
    expect(editor.previewCameraTransition).toBeTruthy();
    expect(editor.previewCameraTransition.toTarget.x).toBeCloseTo(2);
    expect(editor.previewCameraTransition.toTarget.z).toBeCloseTo(1);
    expect(controls.update).not.toHaveBeenCalled();
    expect(editor.rebuildRegionObjects).toHaveBeenCalled();
  });

  it("restores the orbit target to the grid origin when region selection is cleared", () => {
    const editor = Object.create(ThreeEditor.prototype) as any;
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(4, 6, 8);
    const controls = {
      target: new THREE.Vector3(3, 2, 4),
      update: vi.fn(),
    };
    editor.camera = camera;
    editor.controls = controls;
    editor.viewMode = "perspective";
    editor.regionGroup = new THREE.Group();
    editor.modelRoot = new THREE.Group();
    editor.selectedRegionId = "region-living";
    editor.regions = [
      {
        id: "region-living",
        name: "客厅",
        points: [
          { x: 0, z: 0 },
          { x: 3, z: 0 },
          { x: 3, z: 3 },
          { x: 0, z: 3 },
        ],
      },
    ];

    editor.setRegions(editor.regions, null);

    expect(editor.selectedRegionId).toBeNull();
    expect(editor.previewCameraTransition?.toTarget.toArray()).toEqual([0, 0, 0]);
  });

  it("does not render region highlights until a region is selected", () => {
    const editor = Object.create(ThreeEditor.prototype) as any;
    editor.modelRoot = new THREE.Group();
    editor.regionGroup = new THREE.Group();
    editor.selectedRegionId = null;
    editor.regions = [
      {
        id: "region-living",
        name: "客厅",
        points: [
          { x: 0, z: 0 },
          { x: 4, z: 0 },
          { x: 4, z: 3 },
          { x: 0, z: 3 },
        ],
      },
    ];

    editor.rebuildRegionObjects();

    expect(editor.regionGroup.children).toHaveLength(0);
  });

  it("only renders the selected region highlight", () => {
    const editor = Object.create(ThreeEditor.prototype) as any;
    editor.modelRoot = new THREE.Group();
    editor.regionGroup = new THREE.Group();
    editor.selectedRegionId = "region-bedroom";
    editor.regions = [
      {
        id: "region-living",
        name: "客厅",
        points: [
          { x: 0, z: 0 },
          { x: 4, z: 0 },
          { x: 4, z: 3 },
          { x: 0, z: 3 },
        ],
      },
      {
        id: "region-bedroom",
        name: "卧室",
        points: [
          { x: 6, z: 0 },
          { x: 9, z: 0 },
          { x: 9, z: 3 },
          { x: 6, z: 3 },
        ],
      },
    ];

    editor.rebuildRegionObjects();

    expect(editor.regionGroup.children).toHaveLength(1);
    expect(editor.regionGroup.children[0].userData.regionId).toBe("region-bedroom");
  });

  it("keeps drawing active when the polygon is not closed", () => {
    const editor = Object.create(ThreeEditor.prototype) as any;
    editor.regionDrawingEnabled = true;
    editor.regionDraftPoints = [
      { x: 0, z: 0 },
      { x: 4, z: 0 },
      { x: 4, z: 3 },
    ];
    editor.regionDraftHoverPoint = null;
    editor.updateRegionDraftObjects = vi.fn();
    editor.options = { onRegionDraftChange: vi.fn() };

    expect(editor.completeRegionDrawing("客厅")).toBeNull();
    expect(editor.regionDrawingEnabled).toBe(true);
    expect(editor.regionDraftPoints).toHaveLength(3);
  });

  it("removes the closing point when completing a closed polygon", () => {
    const editor = Object.create(ThreeEditor.prototype) as any;
    editor.regionDrawingEnabled = true;
    editor.regionDraftPoints = [
      { x: 0, z: 0 },
      { x: 4, z: 0 },
      { x: 4, z: 3 },
      { x: 0.1, z: 0.08 },
    ];
    editor.regionDraftHoverPoint = null;
    editor.updateRegionDraftObjects = vi.fn();
    editor.options = { onRegionDraftChange: vi.fn() };

    const region = editor.completeRegionDrawing("客厅");

    expect(region?.points).toEqual([
      { x: 0, z: 0 },
      { x: 4, z: 0 },
      { x: 4, z: 3 },
    ]);
    expect(editor.regionDrawingEnabled).toBe(false);
  });

  it("cancels region drawing on right click", () => {
    const editor = Object.create(ThreeEditor.prototype) as any;
    editor.regionDrawingEnabled = true;
    editor.previewMode = false;
    editor.regionDraftPoints = [
      { x: 0, z: 0 },
      { x: 4, z: 0 },
    ];
    editor.regionDraftHoverPoint = { x: 4, z: 3 };
    editor.updateRegionDraftObjects = vi.fn();
    editor.options = { onRegionDraftChange: vi.fn() };
    const event = new MouseEvent("contextmenu", { clientX: 10, clientY: 12 });

    editor.handleContextMenu(event);

    expect(editor.regionDrawingEnabled).toBe(false);
    expect(editor.regionDraftPoints).toHaveLength(0);
    expect(editor.options.onRegionDraftChange).toHaveBeenCalledWith(0);
  });

  it("renders a selected region as an extruded volume", () => {
    const editor = Object.create(ThreeEditor.prototype) as any;
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(4, 2, 4)));
    editor.modelRoot = root;
    editor.regionGroup = new THREE.Group();
    editor.selectedRegionId = "region-living";
    editor.regions = [
      {
        id: "region-living",
        name: "客厅",
        points: [
          { x: 0, z: 0 },
          { x: 4, z: 0 },
          { x: 4, z: 3 },
          { x: 0, z: 3 },
        ],
      },
    ];

    editor.rebuildRegionObjects();

    let hasVolume = false;
    editor.regionGroup.traverse((object: THREE.Object3D) => {
      if (object.userData.regionVolume === true) {
        hasVolume = true;
      }
    });
    expect(hasVolume).toBe(true);
  });

  it("highlights top, bottom, and vertical edges for a selected region volume", () => {
    const editor = Object.create(ThreeEditor.prototype) as any;
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(4, 2, 4)));
    editor.modelRoot = root;
    editor.regionGroup = new THREE.Group();
    editor.selectedRegionId = "region-living";
    editor.regions = [
      {
        id: "region-living",
        name: "客厅",
        points: [
          { x: 0, z: 0 },
          { x: 4, z: 0 },
          { x: 4, z: 3 },
          { x: 0, z: 3 },
        ],
      },
    ];

    editor.rebuildRegionObjects();

    const edgeLayers: string[] = [];
    editor.regionGroup.traverse((object: THREE.Object3D) => {
      if (typeof object.userData.regionEdgeLayer === "string") {
        edgeLayers.push(object.userData.regionEdgeLayer);
      }
    });
    expect(edgeLayers).toEqual(expect.arrayContaining(["top", "bottom", "vertical"]));
  });

  it("supports disabling selected region highlights", () => {
    const editor = Object.create(ThreeEditor.prototype) as any;
    editor.modelRoot = new THREE.Group();
    editor.regionGroup = new THREE.Group();
    editor.selectedRegionId = "region-living";
    editor.regions = [
      {
        id: "region-living",
        name: "客厅",
        highlightMode: "none",
        points: [
          { x: 0, z: 0 },
          { x: 4, z: 0 },
          { x: 4, z: 3 },
          { x: 0, z: 3 },
        ],
      },
    ];

    editor.rebuildRegionObjects();

    expect(editor.regionGroup.children).toHaveLength(0);
  });

  it("can render selected region faces without edge highlights", () => {
    const editor = Object.create(ThreeEditor.prototype) as any;
    editor.modelRoot = new THREE.Group();
    editor.regionGroup = new THREE.Group();
    editor.selectedRegionId = "region-living";
    editor.regions = [
      {
        id: "region-living",
        name: "客厅",
        highlightMode: "faces",
        points: [
          { x: 0, z: 0 },
          { x: 4, z: 0 },
          { x: 4, z: 3 },
          { x: 0, z: 3 },
        ],
      },
    ];

    editor.rebuildRegionObjects();

    let hasVolume = false;
    const edgeLayers: string[] = [];
    editor.regionGroup.traverse((object: THREE.Object3D) => {
      if (object.userData.regionVolume === true) {
        hasVolume = true;
      }
      if (typeof object.userData.regionEdgeLayer === "string") {
        edgeLayers.push(object.userData.regionEdgeLayer);
      }
    });
    expect(hasVolume).toBe(true);
    expect(edgeLayers).toEqual([]);
  });

  it("can render only the selected region bottom face", () => {
    const editor = Object.create(ThreeEditor.prototype) as any;
    editor.modelRoot = new THREE.Group();
    editor.regionGroup = new THREE.Group();
    editor.selectedRegionId = "region-living";
    editor.regions = [
      {
        id: "region-living",
        name: "客厅",
        highlightMode: "bottom",
        points: [
          { x: 0, z: 0 },
          { x: 4, z: 0 },
          { x: 4, z: 3 },
          { x: 0, z: 3 },
        ],
      },
    ];

    editor.rebuildRegionObjects();

    const faceLayers: string[] = [];
    editor.regionGroup.traverse((object: THREE.Object3D) => {
      if (typeof object.userData.regionFaceLayer === "string") {
        faceLayers.push(object.userData.regionFaceLayer);
      }
    });
    expect(faceLayers).toEqual(["bottom"]);
  });
});
