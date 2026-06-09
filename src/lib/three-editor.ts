import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import type { EnvironmentConfig, Vector3Values, ViewMode } from "../types/editor";
import { defaultEnvironment } from "../types/editor";
import { computeOrthoFrustum } from "./ortho-frustum";
import { disposeObjectTree } from "./three-dispose";

export type ThreeEditorOptions = {
  onSelectionChange?: (uuids: string[]) => void;
  onModelChange?: () => void;
  onLoadProgress?: (progress: number) => void;
};

export class ThreeEditor {
  private readonly container: HTMLElement;
  private readonly options: ThreeEditorOptions;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera | null = null;
  private orthoCamera: THREE.OrthographicCamera | null = null;
  private controls: OrbitControls | null = null;
  private grid = new THREE.GridHelper(24, 24, 0x47606c, 0x27333b);
  private ambient = new THREE.AmbientLight(0xffffff, defaultEnvironment.ambientIntensity);
  private directional = new THREE.DirectionalLight(
    0xffffff,
    defaultEnvironment.directionalIntensity,
  );
  private loader: GLTFLoader;
  private dracoLoader: DRACOLoader;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private animationFrame = 0;
  private modelRoot: THREE.Object3D | null = null;
  private objectMap = new Map<string, THREE.Object3D>();
  private selectedIds = new Set<string>();
  private selectionBox = new THREE.BoxHelper(new THREE.Object3D(), 0x29d3c4);
  private multiSelectionGroup = new THREE.Group();
  private viewMode: ViewMode = "perspective";
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
    this.controls.update();

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

    this.renderer.domElement.addEventListener("pointerdown", this.handlePointerDown);
    this.renderer.domElement.addEventListener("pointermove", this.handlePointerMove);
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
    window.removeEventListener("pointerup", this.handlePointerUp);
    if (this.modelRoot) {
      disposeObjectTree(this.modelRoot);
    }
    this.grid.geometry.dispose();
    this.selectionBox.geometry.dispose();
    this.clearMultiSelectionHelpers();
    this.renderer?.dispose();
    this.controls?.dispose();
    this.dracoLoader.dispose();
    this.container.replaceChildren();
    this.objectMap.clear();
  }

  async loadModel(file: File) {
    if (!this.renderer) {
      throw new Error("ThreeEditor has not been initialized.");
    }

    this.clearModel();
    const url = URL.createObjectURL(file);
    try {
      const gltf = await this.loader.loadAsync(url, (event) => {
        if (event.total > 0) {
          this.options.onLoadProgress?.(event.loaded / event.total);
        }
      });
      const root = gltf.scene;
      root.name = root.name || file.name.replace(/\.(glb|gltf)$/i, "");
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
    const gltf = await this.loader.loadAsync(url, (event) => {
      if (event.total > 0) {
        this.options.onLoadProgress?.(event.loaded / event.total);
      }
    });
    const root = gltf.scene;
    root.name = root.name || name;
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
    this.options.onSelectionChange?.([...this.selectedIds]);
  }

  selectObjects(uuids: string[]) {
    this.selectedIds = new Set(uuids.filter((uuid) => this.objectMap.has(uuid)));
    this.updateSelectionBox();
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
    this.options.onSelectionChange?.([]);
    this.options.onModelChange?.();
    return true;
  }

  updatePosition(uuid: string, position: Vector3Values) {
    const object = this.objectMap.get(uuid);
    if (!object) {
      return;
    }
    object.position.set(position.x, position.y, position.z);
    this.updateSelectionBox();
    this.options.onModelChange?.();
  }

  setEnvironment(config: EnvironmentConfig) {
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
  }

  setPreviewMode(enabled: boolean) {
    if (enabled) {
      this.grid.visible = false;
      this.selectionBox.visible = false;
      return;
    }
    this.updateSelectionBox();
  }

  setViewMode(mode: ViewMode) {
    this.viewMode = mode;
    if (!this.controls || !this.modelRoot || !this.camera || !this.orthoCamera) {
      return;
    }
    if (mode === "perspective") {
      this.controls.enabled = true;
      this.controls.enableRotate = true;
      this.controls.object = this.camera;
      this.controls.update();
      return;
    }

    this.controls.enabled = false;
    this.grid.visible = false;
    this.positionOrthoCamera(mode);
  }

  async exportGlb() {
    if (!this.modelRoot) {
      throw new Error("No model loaded.");
    }
    const exporter = new GLTFExporter();
    const result = await exporter.parseAsync(this.modelRoot, { binary: true });
    if (result instanceof ArrayBuffer) {
      return new Blob([result], { type: "model/gltf-binary" });
    }
    return new Blob([JSON.stringify(result)], { type: "model/gltf+json" });
  }

  private clearModel() {
    this.selectObject(null);
    if (this.modelRoot) {
      this.scene.remove(this.modelRoot);
      disposeObjectTree(this.modelRoot);
    }
    this.modelRoot = null;
    this.objectMap.clear();
    this.options.onModelChange?.();
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
    let current: THREE.Object3D | null = hit;
    while (current && current.parent && current.parent !== this.modelRoot) {
      current = current.parent;
    }
    if (current && current.parent === this.modelRoot) {
      return current;
    }
    return hit;
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (!this.renderer || !this.camera || !this.modelRoot) {
      return;
    }
    if (this.viewMode !== "perspective") {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.dragStart = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      this.updateDragBox(this.dragStart, this.dragStart);
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
    this.selectObject(hit ? this.resolveSelectable(hit.object).uuid : null);
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
