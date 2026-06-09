import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import type { EnvironmentConfig, Vector3Values, ViewMode } from "../types/editor";
import type { HaBinding, HaEntityState } from "../types/ha";
import { defaultEnvironment } from "../types/editor";
import { EditorHistory, type EditorHistoryState } from "./editor-history";
import { getBoundEntityIds } from "./ha-bindings";
import { groupObjectsPreservingWorldTransform } from "./model-grouping";
import {
  ensureModelObjectIds,
  getObjectBindings,
  setObjectBindings,
} from "./model-identity";
import { computeOrthoFrustum } from "./ortho-frustum";
import { getResizeRatios, scalePointAroundCenter } from "./selection-transform";
import { resolveSelectableObject } from "./selectable-object";
import { disposeObjectTree } from "./three-dispose";
import { getViewControlMode } from "./view-controls";
import { isVerticalWallLikeBox } from "./wall-visibility";

export type ThreeEditorOptions = {
  onSelectionChange?: (uuids: string[]) => void;
  onModelChange?: () => void;
  onHistoryChange?: (state: EditorHistoryState) => void;
  onLoadProgress?: (progress: number) => void;
};

type ObjectSnapshot = {
  uuid: string;
  object: THREE.Object3D;
  parent: THREE.Object3D | null;
  index: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
};

export class ThreeEditor {
  private readonly container: HTMLElement;
  private readonly options: ThreeEditorOptions;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera | null = null;
  private orthoCamera: THREE.OrthographicCamera | null = null;
  private controls: OrbitControls | null = null;
  private transformControls: TransformControls | null = null;
  private transformHelper: THREE.Object3D | null = null;
  private transformPivot = new THREE.Object3D();
  private transformStartPivot = new THREE.Vector3();
  private transformStartPositions = new Map<string, THREE.Vector3>();
  private transformStartSnapshots: ObjectSnapshot[] = [];
  private grid = new THREE.GridHelper(24, 24, 0x47606c, 0x27333b);
  private ambient = new THREE.AmbientLight(0xffffff, defaultEnvironment.ambientIntensity);
  private directional = new THREE.DirectionalLight(
    0xffffff,
    defaultEnvironment.directionalIntensity,
  );
  private loader: GLTFLoader;
  private dracoLoader: DRACOLoader;
  private history = new EditorHistory();
  private isApplyingHistory = false;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private animationFrame = 0;
  private modelRoot: THREE.Object3D | null = null;
  private objectMap = new Map<string, THREE.Object3D>();
  private originalMaterials = new Map<string, THREE.Material | THREE.Material[]>();
  private haLights = new Map<string, THREE.PointLight>();
  private wallOriginalMaterials = new Map<string, THREE.Material | THREE.Material[]>();
  private selectedIds = new Set<string>();
  private selectionBox = new THREE.BoxHelper(new THREE.Object3D(), 0x29d3c4);
  private multiSelectionGroup = new THREE.Group();
  private viewMode: ViewMode = "perspective";
  private previewMode = false;
  private environmentConfig: EnvironmentConfig = defaultEnvironment;
  private dragStart: { x: number; y: number } | null = null;
  private dragBoxElement: HTMLDivElement | null = null;
  private destroyed = false;
  private lastSize = { width: 0, height: 0 };

  constructor(container: HTMLElement, options: ThreeEditorOptions = {}) {
    this.container = container;
    this.options = options;
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath("/draco/");
    this.loader = new GLTFLoader();
    this.loader.setDRACOLoader(this.dracoLoader);
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = defaultEnvironment.exposure;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x0b1017, 1);
    this.renderer.domElement.className = "h-full w-full outline-none";
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.camera.position.set(7, 6, 8);
    this.orthoCamera = new THREE.OrthographicCamera(-10, 10, 10, -10, -1000, 1000);
    this.orthoCamera.position.set(0, 30, 0);
    this.orthoCamera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.target.set(0, 0.8, 0);
    this.applyControlMode("perspective");
    this.controls.update();

    this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.setMode("translate");
    this.transformControls.setSpace("world");
    this.transformControls.setSize(0.95);
    this.transformControls.enabled = false;
    this.transformHelper = this.transformControls.getHelper();
    this.transformHelper.visible = false;
    this.transformControls.addEventListener("mouseDown", this.handleTransformStart);
    this.transformControls.addEventListener("objectChange", this.handleTransformChange);
    this.transformControls.addEventListener("mouseUp", this.handleTransformEnd);
    this.transformControls.addEventListener(
      "dragging-changed",
      this.handleTransformDraggingChange,
    );

    this.scene.background = new THREE.Color(0x0b1017);
    this.grid.position.y = 0;
    this.scene.add(this.grid);
    this.directional.position.set(
      defaultEnvironment.directionalPosition.x,
      defaultEnvironment.directionalPosition.y,
      defaultEnvironment.directionalPosition.z,
    );
    this.directional.castShadow = true;
    this.directional.shadow.mapSize.set(2048, 2048);
    this.directional.shadow.camera.left = -12;
    this.directional.shadow.camera.right = 12;
    this.directional.shadow.camera.top = 12;
    this.directional.shadow.camera.bottom = -12;
    this.directional.shadow.bias = -0.0001;
    this.scene.add(this.ambient, this.directional);

    this.selectionBox.visible = false;
    this.selectionBox.material.depthTest = false;
    this.selectionBox.renderOrder = 10;
    this.scene.add(this.selectionBox);
    this.scene.add(this.multiSelectionGroup);
    this.scene.add(this.transformPivot);
    this.scene.add(this.transformHelper);

    this.renderer.domElement.addEventListener("pointerdown", this.handlePointerDown);
    this.renderer.domElement.addEventListener("pointermove", this.handlePointerMove);
    this.renderer.domElement.addEventListener("contextmenu", this.handleContextMenu);
    window.addEventListener("pointerup", this.handlePointerUp);
    this.animate();
  }

  dispose() {
    this.destroyed = true;
    cancelAnimationFrame(this.animationFrame);
    this.renderer?.domElement.removeEventListener(
      "pointerdown",
      this.handlePointerDown,
    );
    this.renderer?.domElement.removeEventListener(
      "pointermove",
      this.handlePointerMove,
    );
    this.renderer?.domElement.removeEventListener(
      "contextmenu",
      this.handleContextMenu,
    );
    window.removeEventListener("pointerup", this.handlePointerUp);
    this.restoreWallTransparency();
    if (this.modelRoot) {
      disposeObjectTree(this.modelRoot);
    }
    this.grid.geometry.dispose();
    this.selectionBox.geometry.dispose();
    this.clearMultiSelectionHelpers();
    this.renderer?.dispose();
    this.controls?.dispose();
    this.transformControls?.removeEventListener("mouseDown", this.handleTransformStart);
    this.transformControls?.removeEventListener(
      "objectChange",
      this.handleTransformChange,
    );
    this.transformControls?.removeEventListener("mouseUp", this.handleTransformEnd);
    this.transformControls?.removeEventListener(
      "dragging-changed",
      this.handleTransformDraggingChange,
    );
    this.transformControls?.detach();
    this.transformControls?.dispose();
    this.dracoLoader.dispose();
    this.container.replaceChildren();
    this.objectMap.clear();
  }

  async loadModel(file: File) {
    if (!this.renderer) {
      throw new Error("ThreeEditor has not been initialized.");
    }

    this.clearModel();
    this.clearHistory();
    const url = URL.createObjectURL(file);
    try {
      const gltf = await this.loader.loadAsync(url, (event) => {
        if (event.total > 0) {
          this.options.onLoadProgress?.(event.loaded / event.total);
        }
      });
      const root = gltf.scene;
      root.name = root.name || file.name.replace(/\.(glb|gltf)$/i, "");
      ensureModelObjectIds(root);
      this.prepareModel(root);
      this.modelRoot = root;
      this.scene.add(root);
      this.rebuildObjectMap();
      this.frameObject(root);
      this.setViewMode(this.viewMode);
      this.options.onModelChange?.();
      return root;
    } finally {
      URL.revokeObjectURL(url);
      this.options.onLoadProgress?.(1);
    }
  }

  async loadModelFromUrl(url: string, name = "sample-model") {
    this.clearModel();
    this.clearHistory();
    const gltf = await this.loader.loadAsync(url, (event) => {
      if (event.total > 0) {
        this.options.onLoadProgress?.(event.loaded / event.total);
      }
    });
    const root = gltf.scene;
    root.name = root.name || name;
    ensureModelObjectIds(root);
    this.prepareModel(root);
    this.modelRoot = root;
    this.scene.add(root);
    this.rebuildObjectMap();
    this.frameObject(root);
    this.setViewMode(this.viewMode);
    this.options.onModelChange?.();
    this.options.onLoadProgress?.(1);
    return root;
  }

  selectObject(uuid: string | null) {
    if (uuid && !this.objectMap.has(uuid)) {
      return;
    }
    this.selectedIds = new Set(uuid ? [uuid] : []);
    this.updateSelectionBox();
    this.updateTransformControls();
    this.options.onSelectionChange?.([...this.selectedIds]);
  }

  selectObjects(uuids: string[]) {
    this.selectedIds = new Set(uuids.filter((uuid) => this.objectMap.has(uuid)));
    this.updateSelectionBox();
    this.updateTransformControls();
    this.options.onSelectionChange?.([...this.selectedIds]);
  }

  getSelectedIds() {
    return [...this.selectedIds];
  }

  getRoot() {
    return this.modelRoot;
  }

  getObject(uuid: string) {
    return this.objectMap.get(uuid) ?? null;
  }

  getDebugState() {
    const rootBox = this.modelRoot
      ? new THREE.Box3().setFromObject(this.modelRoot)
      : null;
    return {
      viewMode: this.viewMode,
      selectedCount: this.selectedIds.size,
      objectCount: this.objectMap.size,
      modelBox: rootBox
        ? {
            min: rootBox.min.toArray(),
            max: rootBox.max.toArray(),
            size: rootBox.getSize(new THREE.Vector3()).toArray(),
          }
        : null,
      orthoCamera: this.orthoCamera
        ? {
            position: this.orthoCamera.position.toArray(),
            left: this.orthoCamera.left,
            right: this.orthoCamera.right,
            top: this.orthoCamera.top,
            bottom: this.orthoCamera.bottom,
            near: this.orthoCamera.near,
            far: this.orthoCamera.far,
          }
        : null,
    };
  }

  deleteSelected() {
    if (this.selectedIds.size === 0 || !this.modelRoot) {
      return false;
    }
    const before = this.captureSnapshots(this.getSelectedObjects());
    let deleted = false;
    const objects = [...this.selectedIds]
      .map((id) => this.objectMap.get(id))
      .filter((object): object is THREE.Object3D => Boolean(object))
      .filter((object) => object !== this.modelRoot && Boolean(object.parent));

    for (const object of objects) {
      object.parent?.remove(object);
      disposeObjectTree(object);
      deleted = true;
    }

    if (!deleted) {
      return false;
    }
    this.selectedIds.clear();
    this.rebuildObjectMap();
    this.updateSelectionBox();
    this.updateTransformControls();
    this.options.onSelectionChange?.([]);
    this.options.onModelChange?.();
    const after = this.captureSnapshots(before.map((snapshot) => snapshot.object));
    this.pushTransformHistory("删除零件", before, after, []);
    return true;
  }

  updatePosition(uuid: string, position: Vector3Values) {
    const object = this.objectMap.get(uuid);
    if (!object) {
      return;
    }
    const before = this.captureSnapshots([object]);
    object.position.set(position.x, position.y, position.z);
    this.updateSelectionBox();
    this.updateTransformControls();
    this.options.onModelChange?.();
    this.pushTransformHistory("移动零件", before, this.captureSnapshots([object]));
  }

  updateSelectionScale(scale: Vector3Values) {
    const objects = this.getSelectedObjects();
    if (objects.length !== 1) {
      return;
    }
    const before = this.captureSnapshots(objects);
    objects[0].scale.set(
      Math.max(scale.x, 0.001),
      Math.max(scale.y, 0.001),
      Math.max(scale.z, 0.001),
    );
    this.updateSelectionBox();
    this.updateTransformControls();
    this.options.onModelChange?.();
    this.pushTransformHistory("缩放零件", before, this.captureSnapshots(objects));
  }

  resizeSelection(targetSize: Vector3Values) {
    const objects = this.getSelectedObjects();
    const box = this.getSelectionBox(objects);
    if (!box) {
      return;
    }
    const before = this.captureSnapshots(objects);
    const currentSize = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const ratios = getResizeRatios(
      { x: currentSize.x, y: currentSize.y, z: currentSize.z },
      {
        x: Math.max(targetSize.x, 0.001),
        y: Math.max(targetSize.y, 0.001),
        z: Math.max(targetSize.z, 0.001),
      },
    );
    this.scaleSelectionAroundCenter(objects, center, ratios);
    this.pushTransformHistory("调整尺寸", before, this.captureSnapshots(objects));
  }

  scaleSelectionUniform(multiplier: number) {
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      return;
    }
    const objects = this.getSelectedObjects();
    const box = this.getSelectionBox(objects);
    if (!box) {
      return;
    }
    const before = this.captureSnapshots(objects);
    this.scaleSelectionAroundCenter(
      objects,
      box.getCenter(new THREE.Vector3()),
      { x: multiplier, y: multiplier, z: multiplier },
    );
    this.pushTransformHistory("等比缩放", before, this.captureSnapshots(objects));
  }

  groupSelectedObjects(name = "模型组合") {
    if (!this.modelRoot || this.selectedIds.size < 2) {
      return false;
    }
    const objects = this.getSelectedObjects().filter(
      (object) => object !== this.modelRoot && Boolean(object.parent),
    );
    if (objects.length < 2) {
      return false;
    }
    const parents = new Set(objects.map((object) => object.parent));
    if (parents.size !== 1) {
      return false;
    }
    const [parent] = [...parents] as THREE.Object3D[];
    const selectedObjectIds = objects.map((object) => object.uuid);
    const childOrder = [...parent.children];
    const group = groupObjectsPreservingWorldTransform(parent, objects, name);
    if (!group) {
      return false;
    }
    ensureModelObjectIds(this.modelRoot);
    this.rebuildObjectMap();
    this.selectedIds = new Set([group.uuid]);
    this.updateSelectionBox();
    this.updateTransformControls();
    this.history.push({
      label: "组合模型",
      undo: () => {
        for (const object of objects) {
          parent.attach(object);
        }
        group.parent?.remove(group);
        parent.children = childOrder.filter((child) => child.parent === parent);
        this.rebuildObjectMap();
        this.selectedIds = new Set(selectedObjectIds);
        this.updateSelectionBox();
        this.updateTransformControls();
        this.options.onSelectionChange?.(selectedObjectIds);
        this.options.onModelChange?.();
      },
      redo: () => {
        const regrouped = groupObjectsPreservingWorldTransform(parent, objects, name);
        if (!regrouped) {
          return;
        }
        parent.remove(regrouped);
        parent.add(group);
        group.position.copy(regrouped.position);
        group.quaternion.copy(regrouped.quaternion);
        group.scale.copy(regrouped.scale);
        for (const object of objects) {
          group.attach(object);
        }
        this.rebuildObjectMap();
        this.selectedIds = new Set([group.uuid]);
        this.updateSelectionBox();
        this.updateTransformControls();
        this.options.onSelectionChange?.([group.uuid]);
        this.options.onModelChange?.();
      },
    });
    this.options.onSelectionChange?.([group.uuid]);
    this.options.onHistoryChange?.(this.history.getState());
    this.options.onModelChange?.();
    return true;
  }

  undo() {
    const changed = this.runHistoryAction(() => this.history.undo());
    if (changed) {
      this.options.onHistoryChange?.(this.history.getState());
    }
    return changed;
  }

  redo() {
    const changed = this.runHistoryAction(() => this.history.redo());
    if (changed) {
      this.options.onHistoryChange?.(this.history.getState());
    }
    return changed;
  }

  getHistoryState() {
    return this.history.getState();
  }

  getSelectedBindings() {
    return this.getSelectedObjects().flatMap((object) => getObjectBindings(object));
  }

  updateBindingsForSelection(bindings: HaBinding[]) {
    const objects = this.getSelectedObjects();
    if (objects.length === 0) {
      return;
    }
    for (const object of objects) {
      setObjectBindings(object, bindings);
    }
    this.history.push({
      label: "绑定 HA 实体",
      undo: () => undefined,
      redo: () => undefined,
    });
    this.options.onHistoryChange?.(this.history.getState());
    this.options.onModelChange?.();
  }

  applyHaStates(states: Record<string, HaEntityState>) {
    if (!this.modelRoot) {
      return;
    }
    const activeLightEntities = new Set(
      Object.values(states)
        .filter((state) => state.entity_id.startsWith("light.") && state.state === "on")
        .map((state) => state.entity_id),
    );

    this.modelRoot.traverse((object) => {
      const bindings = getObjectBindings(object);
      const boundEntityIds = getBoundEntityIds(bindings);
      const activeEntityId = boundEntityIds.find((entityId) =>
        activeLightEntities.has(entityId),
      );
      if (activeEntityId) {
        this.enableObjectEmission(object, states[activeEntityId]);
      } else {
        this.disableObjectEmission(object);
      }
    });
  }

  getSelectionScreenAnchor() {
    if (!this.renderer) {
      return null;
    }
    const box = this.getSelectionBox();
    if (!box) {
      return null;
    }
    const center = box.getCenter(new THREE.Vector3());
    const projected = center.project(this.getActiveCamera());
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: rect.left + ((projected.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - projected.y) / 2) * rect.height,
    };
  }

  markSaved() {
    this.history.markSaved();
    this.options.onHistoryChange?.(this.history.getState());
  }

  setEnvironment(config: EnvironmentConfig) {
    this.environmentConfig = config;
    this.ambient.intensity = config.ambientIntensity;
    this.directional.intensity = config.directionalIntensity;
    this.directional.position.set(
      config.directionalPosition.x,
      config.directionalPosition.y,
      config.directionalPosition.z,
    );
    this.grid.visible = config.gridVisible;
    if (this.renderer) {
      this.renderer.toneMappingExposure = config.exposure;
    }
    this.updateWallTransparency();
  }

  setPreviewMode(enabled: boolean) {
    this.previewMode = enabled;
    if (enabled) {
      this.grid.visible = false;
      this.selectionBox.visible = false;
      this.clearMultiSelectionHelpers();
      this.transformControls?.detach();
      if (this.transformControls) {
        this.transformControls.enabled = false;
      }
      this.setTransformHelperVisible(false);
      this.updateWallTransparency();
      return;
    }
    this.updateSelectionBox();
    this.updateTransformControls();
    this.updateWallTransparency();
  }

  setViewMode(mode: ViewMode) {
    this.viewMode = mode;
    if (!this.controls || !this.modelRoot || !this.camera || !this.orthoCamera) {
      return;
    }
    this.applyControlMode(mode);
    if (mode === "perspective") {
      this.controls.object = this.camera;
      if (this.transformControls) {
        this.transformControls.camera = this.camera;
      }
      this.updateTransformControls();
      this.controls.update();
      this.updateWallTransparency();
      return;
    }

    this.transformControls?.detach();
    if (this.transformControls) {
      this.transformControls.enabled = false;
      this.transformControls.camera = this.orthoCamera;
    }
    this.setTransformHelperVisible(false);
    this.grid.visible = false;
    this.positionOrthoCamera(mode);
    this.controls.object = this.orthoCamera;
    this.controls.target.copy(this.getModelCenter());
    this.controls.update();
    this.updateWallTransparency();
  }

  async exportGlb() {
    if (!this.modelRoot) {
      throw new Error("No model loaded.");
    }
    const exporter = new GLTFExporter();
    this.restoreWallTransparency();
    try {
      const result = await exporter.parseAsync(this.modelRoot, { binary: true });
      if (result instanceof ArrayBuffer) {
        return new Blob([result], { type: "model/gltf-binary" });
      }
      return new Blob([JSON.stringify(result)], { type: "model/gltf+json" });
    } finally {
      this.updateWallTransparency();
    }
  }

  private clearModel() {
    this.selectObject(null);
    this.restoreWallTransparency();
    if (this.modelRoot) {
      this.scene.remove(this.modelRoot);
      disposeObjectTree(this.modelRoot);
    }
    this.modelRoot = null;
    this.objectMap.clear();
    this.options.onModelChange?.();
  }

  private clearHistory() {
    this.history.clear();
    this.options.onHistoryChange?.(this.history.getState());
  }

  private prepareModel(root: THREE.Object3D) {
    root.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        mesh.userData.selectable = true;
      }
    });
  }

  private rebuildObjectMap() {
    this.objectMap.clear();
    this.modelRoot?.traverse((node) => {
      this.objectMap.set(node.uuid, node);
    });
  }

  private frameObject(object: THREE.Object3D) {
    if (!this.camera || !this.controls) {
      return;
    }
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) {
      return;
    }
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z);
    const distance = maxSize / (2 * Math.tan((this.camera.fov * Math.PI) / 360));
    const direction = new THREE.Vector3(0.9, 0.65, 1).normalize();
    this.camera.position.copy(center.clone().add(direction.multiplyScalar(distance * 1.8)));
    this.camera.near = Math.max(distance / 100, 0.01);
    this.camera.far = Math.max(distance * 100, 1000);
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(center);
    this.controls.update();
  }

  private updateSelectionBox() {
    this.clearMultiSelectionHelpers();
    if (this.previewMode) {
      this.selectionBox.visible = false;
      return;
    }
    if (this.selectedIds.size === 0) {
      this.selectionBox.visible = false;
      return;
    }
    if (this.selectedIds.size > 1) {
      this.selectionBox.visible = false;
      this.updateMultiSelectionHelpers();
      return;
    }
    const [selectedId] = [...this.selectedIds];
    const object = this.objectMap.get(selectedId);
    if (!object) {
      this.selectionBox.visible = false;
      return;
    }
    this.selectionBox.setFromObject(object);
    this.selectionBox.visible = true;
    this.updateMultiSelectionHelpers();
  }

  private resolveSelectable(hit: THREE.Object3D) {
    return this.modelRoot ? resolveSelectableObject(hit, this.modelRoot) : hit;
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (!this.renderer || !this.camera || !this.modelRoot) {
      return;
    }
    if (this.transformControls?.axis) {
      return;
    }
    if (this.previewMode && this.viewMode !== "perspective") {
      return;
    }
    if (this.previewMode && event.button !== 0) {
      return;
    }
    if (this.viewMode !== "perspective" && event.button === 0) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.dragStart = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      this.updateDragBox(this.dragStart, this.dragStart);
      return;
    }
    if (this.viewMode !== "perspective") {
      return;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes: THREE.Object3D[] = [];
    this.modelRoot.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        meshes.push(node);
      }
    });
    const [hit] = this.raycaster.intersectObjects(meshes, true);
    if (!hit) {
      if (!event.shiftKey) {
        this.selectObject(null);
      }
      return;
    }
    const target = this.resolveSelectable(hit.object);
    if (event.shiftKey && !this.previewMode) {
      this.toggleObjectSelection(target.uuid);
      return;
    }
    this.selectObject(target.uuid);
  };

  private handleContextMenu = (event: MouseEvent) => {
    if (this.viewMode !== "perspective") {
      event.preventDefault();
    }
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.renderer || !this.dragStart || this.viewMode === "perspective") {
      return;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.updateDragBox(this.dragStart, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (!this.renderer || !this.dragStart || this.viewMode === "perspective") {
      return;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    const end = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    const box = this.normalizedDragRect(this.dragStart, end);
    this.dragStart = null;
    this.removeDragBox();
    if (box.width < 4 || box.height < 4) {
      return;
    }
    this.selectObjects(this.findObjectsFullyInsideRect(box));
  };

  private resizeIfNeeded() {
    if (!this.renderer || !this.camera) {
      return;
    }
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    if (width === this.lastSize.width && height === this.lastSize.height) {
      return;
    }
    this.lastSize = { width, height };
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.viewMode !== "perspective") {
      this.positionOrthoCamera(this.viewMode);
    }
  }

  private animate = () => {
    if (this.destroyed || !this.renderer || !this.camera) {
      return;
    }
    this.resizeIfNeeded();
    this.controls?.update();
    this.renderer.render(this.scene, this.getActiveCamera());
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  private getActiveCamera() {
    return this.viewMode === "perspective" || !this.orthoCamera
      ? this.camera!
      : this.orthoCamera;
  }

  private positionOrthoCamera(mode: Exclude<ViewMode, "perspective">) {
    if (!this.orthoCamera || !this.modelRoot) {
      return;
    }
    const box = new THREE.Box3().setFromObject(this.modelRoot);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z, 1);
    const aspect =
      this.lastSize.width > 0 && this.lastSize.height > 0
        ? this.lastSize.width / this.lastSize.height
        : this.container.clientWidth / Math.max(this.container.clientHeight, 1);
    const frustum = computeOrthoFrustum(maxSize, aspect || 1);
    this.orthoCamera.left = frustum.left;
    this.orthoCamera.right = frustum.right;
    this.orthoCamera.top = frustum.top;
    this.orthoCamera.bottom = frustum.bottom;
    this.orthoCamera.near = frustum.near;
    this.orthoCamera.far = frustum.far;
    if (mode === "top") {
      this.orthoCamera.position.set(center.x, center.y + frustum.distance, center.z);
      this.orthoCamera.up.set(0, 0, -1);
    } else if (mode === "front") {
      this.orthoCamera.position.set(center.x, center.y, center.z + frustum.distance);
      this.orthoCamera.up.set(0, 1, 0);
    } else {
      this.orthoCamera.position.set(center.x + frustum.distance, center.y, center.z);
      this.orthoCamera.up.set(0, 1, 0);
    }
    this.orthoCamera.lookAt(center);
    this.orthoCamera.updateProjectionMatrix();
  }

  private getModelCenter() {
    if (!this.modelRoot) {
      return new THREE.Vector3();
    }
    return new THREE.Box3().setFromObject(this.modelRoot).getCenter(new THREE.Vector3());
  }

  private applyControlMode(mode: ViewMode) {
    if (!this.controls) {
      return;
    }
    const controlMode = getViewControlMode(mode);
    this.controls.enabled = controlMode.enabled;
    this.controls.enableRotate = controlMode.enableRotate;
    this.controls.enableZoom = controlMode.enableZoom;
    this.controls.enablePan = controlMode.enablePan;
    this.controls.mouseButtons = controlMode.mouseButtons;
  }

  private captureSnapshots(objects: THREE.Object3D[]): ObjectSnapshot[] {
    return objects.map((object) => ({
      uuid: object.uuid,
      object,
      parent: object.parent,
      index: object.parent ? object.parent.children.indexOf(object) : -1,
      position: object.position.clone(),
      rotation: object.rotation.clone(),
      scale: object.scale.clone(),
    }));
  }

  private restoreSnapshots(snapshots: ObjectSnapshot[], selectedIds?: string[]) {
    for (const snapshot of snapshots) {
      if (snapshot.parent && snapshot.object.parent !== snapshot.parent) {
        snapshot.object.parent?.remove(snapshot.object);
        const targetIndex =
          snapshot.index >= 0
            ? Math.min(snapshot.index, snapshot.parent.children.length)
            : snapshot.parent.children.length;
        snapshot.parent.children.splice(targetIndex, 0, snapshot.object);
        snapshot.object.parent = snapshot.parent;
      } else if (!snapshot.parent && snapshot.object.parent) {
        snapshot.object.parent.remove(snapshot.object);
      }
      snapshot.object.position.copy(snapshot.position);
      snapshot.object.rotation.copy(snapshot.rotation);
      snapshot.object.scale.copy(snapshot.scale);
      snapshot.object.updateMatrixWorld(true);
    }
    this.rebuildObjectMap();
    this.selectedIds = new Set(
      (selectedIds ?? [...this.selectedIds]).filter((id) => this.objectMap.has(id)),
    );
    this.updateSelectionBox();
    this.updateTransformControls();
    this.options.onSelectionChange?.([...this.selectedIds]);
    this.options.onModelChange?.();
  }

  private snapshotsChanged(before: ObjectSnapshot[], after: ObjectSnapshot[]) {
    if (before.length !== after.length) {
      return true;
    }
    const afterById = new Map(after.map((snapshot) => [snapshot.uuid, snapshot]));
    return before.some((snapshot) => {
      const next = afterById.get(snapshot.uuid);
      return (
        !next ||
        next.parent !== snapshot.parent ||
        next.index !== snapshot.index ||
        !next.position.equals(snapshot.position) ||
        !next.rotation.equals(snapshot.rotation) ||
        !next.scale.equals(snapshot.scale)
      );
    });
  }

  private pushTransformHistory(
    label: string,
    before: ObjectSnapshot[],
    after: ObjectSnapshot[],
    selectedIds = [...this.selectedIds],
  ) {
    if (this.isApplyingHistory || !this.snapshotsChanged(before, after)) {
      return;
    }
    const beforeIds = before.map((snapshot) => snapshot.uuid);
    const afterIds = selectedIds;
    this.history.push({
      label,
      undo: () => this.restoreSnapshots(before, beforeIds),
      redo: () => this.restoreSnapshots(after, afterIds),
    });
    this.options.onHistoryChange?.(this.history.getState());
  }

  private runHistoryAction(action: () => boolean) {
    this.isApplyingHistory = true;
    try {
      return action();
    } finally {
      this.isApplyingHistory = false;
    }
  }

  private toggleObjectSelection(uuid: string) {
    if (!this.objectMap.has(uuid)) {
      return;
    }
    const nextSelectedIds = new Set(this.selectedIds);
    if (nextSelectedIds.has(uuid)) {
      nextSelectedIds.delete(uuid);
    } else {
      nextSelectedIds.add(uuid);
    }
    this.selectedIds = nextSelectedIds;
    this.updateSelectionBox();
    this.updateTransformControls();
    this.options.onSelectionChange?.([...this.selectedIds]);
  }

  private getSelectedObjects() {
    return [...this.selectedIds]
      .map((id) => this.objectMap.get(id))
      .filter((object): object is THREE.Object3D => Boolean(object));
  }

  private getSelectionBox(objects = this.getSelectedObjects()) {
    if (objects.length === 0) {
      return null;
    }
    const box = new THREE.Box3();
    for (const object of objects) {
      box.expandByObject(object);
    }
    return box.isEmpty() ? null : box;
  }

  private updateTransformControls() {
    if (!this.transformControls || this.viewMode !== "perspective" || this.previewMode) {
      this.transformControls?.detach();
      if (this.transformControls) {
        this.transformControls.enabled = false;
      }
      this.setTransformHelperVisible(false);
      return;
    }
    const box = this.getSelectionBox();
    if (!box) {
      this.transformControls.detach();
      this.transformControls.enabled = false;
      this.setTransformHelperVisible(false);
      return;
    }
    this.transformPivot.position.copy(box.getCenter(new THREE.Vector3()));
    this.transformPivot.updateMatrixWorld(true);
    this.transformControls.attach(this.transformPivot);
    this.transformControls.enabled = true;
    this.setTransformHelperVisible(true);
  }

  private setTransformHelperVisible(visible: boolean) {
    if (this.transformHelper) {
      this.transformHelper.visible = visible;
    }
  }

  private updateWallTransparency() {
    const shouldApply =
      Boolean(this.modelRoot) &&
      this.viewMode === "perspective" &&
      this.environmentConfig.wallOpacity < 0.999;

    if (!shouldApply || !this.modelRoot) {
      this.restoreWallTransparency();
      return;
    }

    const activeWallIds = new Set<string>();
    this.modelRoot.updateMatrixWorld(true);
    this.modelRoot.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }
      const box = new THREE.Box3().setFromObject(mesh);
      const size = box.getSize(new THREE.Vector3());
      if (!isVerticalWallLikeBox({ x: size.x, y: size.y, z: size.z })) {
        return;
      }
      activeWallIds.add(mesh.uuid);
      this.applyWallTransparency(mesh);
    });

    for (const meshId of [...this.wallOriginalMaterials.keys()]) {
      if (!activeWallIds.has(meshId)) {
        const mesh = this.objectMap.get(meshId) as THREE.Mesh | undefined;
        if (mesh?.isMesh) {
          this.restoreWallTransparencyForMesh(mesh);
        } else {
          this.wallOriginalMaterials.delete(meshId);
        }
      }
    }
  }

  private applyWallTransparency(mesh: THREE.Mesh) {
    if (!this.wallOriginalMaterials.has(mesh.uuid)) {
      this.wallOriginalMaterials.set(mesh.uuid, mesh.material);
      mesh.material = this.cloneMaterialSet(mesh.material);
    }
    for (const material of this.materialList(mesh.material)) {
      material.transparent = true;
      material.opacity = this.environmentConfig.wallOpacity;
      material.depthWrite = false;
      material.needsUpdate = true;
    }
  }

  private restoreWallTransparency() {
    if (this.wallOriginalMaterials.size === 0) {
      return;
    }
    for (const meshId of [...this.wallOriginalMaterials.keys()]) {
      const mesh = this.objectMap.get(meshId) as THREE.Mesh | undefined;
      if (mesh?.isMesh) {
        this.restoreWallTransparencyForMesh(mesh);
      } else {
        this.wallOriginalMaterials.delete(meshId);
      }
    }
  }

  private restoreWallTransparencyForMesh(mesh: THREE.Mesh) {
    const original = this.wallOriginalMaterials.get(mesh.uuid);
    if (!original) {
      return;
    }
    for (const material of this.materialList(mesh.material)) {
      material.dispose();
    }
    mesh.material = original;
    this.wallOriginalMaterials.delete(mesh.uuid);
  }

  private cloneMaterialSet(material: THREE.Material | THREE.Material[]) {
    return Array.isArray(material)
      ? material.map((entry) => entry.clone())
      : material.clone();
  }

  private materialList(material: THREE.Material | THREE.Material[]) {
    return Array.isArray(material) ? material : [material];
  }

  private scaleSelectionAroundCenter(
    objects: THREE.Object3D[],
    center: THREE.Vector3,
    ratios: Vector3Values,
  ) {
    for (const object of objects) {
      const worldPosition = object.getWorldPosition(new THREE.Vector3());
      const nextWorldPosition = scalePointAroundCenter(
        { x: worldPosition.x, y: worldPosition.y, z: worldPosition.z },
        { x: center.x, y: center.y, z: center.z },
        ratios,
      );
      if (object.parent) {
        object.position.copy(
          object.parent.worldToLocal(
            new THREE.Vector3(
              nextWorldPosition.x,
              nextWorldPosition.y,
              nextWorldPosition.z,
            ),
          ),
        );
      }
      object.scale.set(
        Math.max(object.scale.x * ratios.x, 0.001),
        Math.max(object.scale.y * ratios.y, 0.001),
        Math.max(object.scale.z * ratios.z, 0.001),
      );
    }
    this.updateSelectionBox();
    this.updateTransformControls();
    this.options.onModelChange?.();
  }

  private enableObjectEmission(object: THREE.Object3D, state: HaEntityState) {
    const brightness = Number(state.attributes.brightness ?? 180);
    const intensity = Math.max(0.35, Math.min(brightness / 160, 2.2));
    const rgb = Array.isArray(state.attributes.rgb_color)
      ? (state.attributes.rgb_color as number[])
      : [255, 236, 190];
    const color = new THREE.Color(
      (rgb[0] ?? 255) / 255,
      (rgb[1] ?? 236) / 255,
      (rgb[2] ?? 190) / 255,
    );

    object.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }
      if (!this.originalMaterials.has(mesh.uuid)) {
        this.originalMaterials.set(mesh.uuid, mesh.material);
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((material) => material.clone())
          : mesh.material.clone();
      }
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        const standard = material as THREE.MeshStandardMaterial;
        if ("emissive" in standard) {
          standard.emissive.copy(color);
          standard.emissiveIntensity = intensity;
          standard.needsUpdate = true;
        }
      }
    });

    let light = this.haLights.get(object.uuid);
    if (!light) {
      light = new THREE.PointLight(color, intensity * 1.4, 8, 2);
      this.haLights.set(object.uuid, light);
      this.scene.add(light);
    }
    const box = new THREE.Box3().setFromObject(object);
    light.position.copy(box.getCenter(new THREE.Vector3()));
    light.color.copy(color);
    light.intensity = intensity * 1.4;
    light.visible = true;
  }

  private disableObjectEmission(object: THREE.Object3D) {
    object.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }
      const original = this.originalMaterials.get(mesh.uuid);
      if (!original) {
        return;
      }
      const currentMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of currentMaterials) {
        material.dispose();
      }
      mesh.material = original;
      this.originalMaterials.delete(mesh.uuid);
    });
    const light = this.haLights.get(object.uuid);
    if (light) {
      light.visible = false;
    }
  }

  private handleTransformStart = () => {
    this.transformStartPivot.copy(this.transformPivot.position);
    this.transformStartPositions.clear();
    this.transformStartSnapshots = this.captureSnapshots(this.getSelectedObjects());
    for (const object of this.getSelectedObjects()) {
      this.transformStartPositions.set(
        object.uuid,
        object.getWorldPosition(new THREE.Vector3()),
      );
    }
  };

  private handleTransformChange = () => {
    const delta = this.transformPivot.position.clone().sub(this.transformStartPivot);
    for (const object of this.getSelectedObjects()) {
      const startWorldPosition = this.transformStartPositions.get(object.uuid);
      if (!startWorldPosition || !object.parent) {
        continue;
      }
      const nextWorldPosition = startWorldPosition.clone().add(delta);
      object.position.copy(object.parent.worldToLocal(nextWorldPosition));
    }
    this.updateSelectionBox();
  };

  private handleTransformEnd = () => {
    const objects = this.getSelectedObjects();
    const before = this.transformStartSnapshots;
    const after = this.captureSnapshots(objects);
    this.transformStartPositions.clear();
    this.transformStartSnapshots = [];
    this.updateTransformControls();
    this.options.onModelChange?.();
    this.pushTransformHistory("移动零件", before, after);
  };

  private handleTransformDraggingChange = (event: { value: unknown }) => {
    if (!this.controls) {
      return;
    }
    this.controls.enabled = event.value !== true;
  };

  private normalizedDragRect(
    start: { x: number; y: number },
    end: { x: number; y: number },
  ) {
    const left = Math.min(start.x, end.x);
    const top = Math.min(start.y, end.y);
    const width = Math.abs(start.x - end.x);
    const height = Math.abs(start.y - end.y);
    return { left, top, right: left + width, bottom: top + height, width, height };
  }

  private updateDragBox(start: { x: number; y: number }, end: { x: number; y: number }) {
    const rect = this.normalizedDragRect(start, end);
    if (!this.dragBoxElement) {
      this.dragBoxElement = document.createElement("div");
      this.dragBoxElement.className =
        "pointer-events-none absolute z-20 border border-primary bg-primary/10";
      this.container.appendChild(this.dragBoxElement);
    }
    Object.assign(this.dragBoxElement.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }

  private removeDragBox() {
    this.dragBoxElement?.remove();
    this.dragBoxElement = null;
  }

  private findObjectsFullyInsideRect(rect: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  }) {
    if (!this.modelRoot || !this.renderer) {
      return [];
    }
    const camera = this.getActiveCamera();
    const canvasRect = this.renderer.domElement.getBoundingClientRect();
    const selected: string[] = [];
    this.modelRoot.traverse((node) => {
      if (!(node as THREE.Mesh).isMesh) {
        return;
      }
      const box = new THREE.Box3().setFromObject(node);
      if (box.isEmpty()) {
        return;
      }
      const corners = this.getBoxCorners(box);
      const fullyInside = corners.every((corner) => {
        const projected = corner.project(camera);
        const x = ((projected.x + 1) / 2) * canvasRect.width;
        const y = ((1 - projected.y) / 2) * canvasRect.height;
        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
      });
      if (fullyInside) {
        selected.push(node.uuid);
      }
    });
    return selected;
  }

  private getBoxCorners(box: THREE.Box3) {
    const { min, max } = box;
    return [
      new THREE.Vector3(min.x, min.y, min.z),
      new THREE.Vector3(min.x, min.y, max.z),
      new THREE.Vector3(min.x, max.y, min.z),
      new THREE.Vector3(min.x, max.y, max.z),
      new THREE.Vector3(max.x, min.y, min.z),
      new THREE.Vector3(max.x, min.y, max.z),
      new THREE.Vector3(max.x, max.y, min.z),
      new THREE.Vector3(max.x, max.y, max.z),
    ];
  }

  private clearMultiSelectionHelpers() {
    for (const child of this.multiSelectionGroup.children) {
      const helper = child as THREE.BoxHelper;
      helper.geometry.dispose();
    }
    this.multiSelectionGroup.clear();
  }

  private updateMultiSelectionHelpers() {
    this.clearMultiSelectionHelpers();
    if (this.selectedIds.size <= 1) {
      return;
    }
    this.selectionBox.visible = false;
    for (const id of this.selectedIds) {
      const object = this.objectMap.get(id);
      if (!object) {
        continue;
      }
      const helper = new THREE.BoxHelper(object, 0x29d3c4);
      helper.material.depthTest = false;
      helper.renderOrder = 10;
      this.multiSelectionGroup.add(helper);
    }
  }
}
