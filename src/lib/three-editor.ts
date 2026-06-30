import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import type {
  AppearanceTheme,
} from "../types/appearance";
import type {
  EnvironmentConfig,
  EditorRegion,
  PerformanceConfig,
  PreviewCameraMode,
  RegionPoint,
  RenderBackend,
  RenderQuality,
  TransformMode,
  Vector3Values,
  ViewMode,
} from "../types/editor";
import {
  defaultWeather,
  getWeatherPreset,
  resolveWeatherCloudAltitude,
  resolveWeatherCloudParticleCount,
  resolveWeatherCloudScale,
  resolveWeatherCloudWrapPadding,
  resolveWeatherBackground,
  resolveWeatherEffectSpan,
  resolveWeatherFogDensity,
  resolveWeatherLightningRadius,
  resolveWeatherLightningCooldownFrames,
  resolveWeatherLightningStrikePosition,
  resolveWeatherParticleCount,
  resolveWeatherRainDropLength,
  resolveWeatherRainParticleCount,
  resolveWeatherRainSpeed,
  resolveWeatherRainTop,
  resolveWeatherScale,
  resolveWeatherSkyPadding,
  resolveWeatherSunOpacity,
  resolveWeatherSunScale,
  type WeatherConfig,
  type WeatherPreset,
} from "./weather-presets";
import type {
  HaBinding,
  HaCoverCapabilityConfig,
  HaEntityState,
  HaLightCapabilityConfig,
  HaManualDeviceType,
} from "../types/ha";
import { defaultEnvironment, defaultPerformance } from "../types/editor";
import { EditorHistory, type EditorHistoryState } from "./editor-history";
import {
  clampToFirstPersonBounds,
  getFirstPersonSpawnPosition,
  getFirstPersonVelocity,
  type FirstPersonDirection,
  type FirstPersonMoveState,
} from "./first-person-controls";
import {
  applyEditorLocalConfig,
  createEditorLocalConfig,
  type EditorLocalConfig,
} from "./editor-local-config";
import type { HaRuntimeConfig } from "./ha-config";
import { FpsMeter } from "./fps-meter";
import { compressGlbWithDraco } from "./glb-compression";
import {
  resolveLightCapability,
  resolveLightRenderIntensity,
} from "./ha-capabilities/light";
import {
  defaultCoverCapabilityConfig,
  resolveCoverAnimationStepPercent,
  resolveCoverAnimationTransform,
  resolveCoverPositionPercent,
  resolveSymmetricalCoverTargetMode,
} from "./ha-capabilities/cover";
import { getBoundEntityIds } from "./ha-bindings";
import {
  getEditorRegionBounds,
  isPointInEditorRegion,
} from "./editor-regions";
import { groupObjectsPreservingWorldTransform } from "./model-grouping";
import {
  assignFreshModelObjectIds,
  ensureModelObjectIds,
  getCoverCapabilityConfig,
  getModelObjectId,
  getLightCapabilityConfig,
  getObjectRegionAssignment,
  setManualDeviceType,
  getObjectBindings,
  setCoverCapabilityConfig,
  setLightCapabilityConfig,
  setObjectRegionAssignment,
  setObjectBindings,
  syncAllCoverTargetBindings,
  syncCoverTargetBindings,
} from "./model-identity";
import { computeOrthoFrustum } from "./ortho-frustum";
import { removeOwnedElement } from "./owned-dom";
import {
  enhanceMaterialForRole,
  resolveRealisticMaterialRole,
} from "./realistic-materials";
import {
  makeMaterialDoubleSided,
  makeMaterialOpaque,
  shouldUseDoubleSidedMaterial,
} from "./material-visibility";
import { getResizeRatios, scalePointAroundCenter } from "./selection-transform";
import { computeDirectionalShadowBounds } from "./shadow-bounds";
import { resolveSelectableObject } from "./selectable-object";
import { disposeObjectTree } from "./three-dispose";
import { getIncrementalTransformDelta } from "./transform-delta";
import { getViewControlMode } from "./view-controls";
import { isVerticalWallLikeBox } from "./wall-visibility";
import {
  getRenderQualityProfile,
  resolveToneMappingExposure,
} from "./render-quality";
import { withTimeout } from "./with-timeout";
import {
  createRainLineEffect,
  createWindLineEffect,
  updateRainLineEffect,
  updateWindLineEffect,
  type RainLineEffect,
  type WindLineEffect,
} from "./weather-effects";

export type ThreeEditorOptions = {
  renderBackend?: RenderBackend;
  quality?: RenderQuality;
  realisticRenderingEnabled?: boolean;
  onSelectionChange?: (uuids: string[]) => void;
  onObjectContextMenu?: (event: { clientX: number; clientY: number; uuid: string }) => void;
  onRegionDraftChange?: (pointCount: number) => void;
  onModelChange?: () => void;
  onHistoryChange?: (state: EditorHistoryState) => void;
  onLoadProgress?: (progress: number) => void;
  onFpsChange?: (
    fps: number,
    stats?: { calls: number; triangles: number; points: number; lines: number },
  ) => void;
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

type HaLightObject = THREE.PointLight | THREE.SpotLight | THREE.RectAreaLight;

type HaLightRig = {
  type: HaLightCapabilityConfig["lightType"];
  group: THREE.Group;
  light: HaLightObject;
};

type HaCoverAnimation = {
  object: THREE.Object3D;
  config: HaCoverCapabilityConfig;
  currentPositionPercent: number;
  targetPositionPercent: number;
  restPosition: THREE.Vector3;
  restScale: THREE.Vector3;
  size: THREE.Vector3;
  localBounds: {
    min: THREE.Vector3;
    max: THREE.Vector3;
  };
};

type HaPanelMarker = {
  group: THREE.Group;
  helpers: THREE.BoxHelper[];
  objectIds: string[];
};

type WeatherCloud = {
  sprite: THREE.Sprite;
  speed: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

type WeatherBounds = {
  center: THREE.Vector3;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  modelTop: number;
  skyPadding: number;
  minZ: number;
  maxZ: number;
};

type PreviewCameraTransition = {
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  startTime: number;
  duration: number;
  fromPosition: THREE.Vector3;
  toPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
};

type FirstPersonPointerState = {
  pointerId: number;
  x: number;
  y: number;
};

const REGION_CLOSE_THRESHOLD = 0.35;

function colorTemperatureToColor(kelvin: number) {
  const temperature = THREE.MathUtils.clamp(kelvin, 1000, 12000) / 100;
  const red =
    temperature <= 66
      ? 255
      : 329.698727446 * (temperature - 60) ** -0.1332047592;
  const green =
    temperature <= 66
      ? 99.4708025861 * Math.log(temperature) - 161.1195681661
      : 288.1221695283 * (temperature - 60) ** -0.0755148492;
  const blue =
    temperature >= 66
      ? 255
      : temperature <= 19
        ? 0
        : 138.5177312231 * Math.log(temperature - 10) - 305.0447927307;

  return new THREE.Color(
    THREE.MathUtils.clamp(red, 0, 255) / 255,
    THREE.MathUtils.clamp(green, 0, 255) / 255,
    THREE.MathUtils.clamp(blue, 0, 255) / 255,
  );
}

export class ThreeEditor {
  private readonly container: HTMLElement;
  private readonly options: ThreeEditorOptions;
  private renderer: THREE.WebGLRenderer | WebGPURenderer | null = null;
  private activeRenderBackend: RenderBackend = "webgl";
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera | null = null;
  private orthoCamera: THREE.OrthographicCamera | null = null;
  private controls: OrbitControls | null = null;
  private transformControls: TransformControls | null = null;
  private transformHelper: THREE.Object3D | null = null;
  private transformPivot = new THREE.Object3D();
  private transformStartPivot = new THREE.Vector3();
  private transformPreviousPivot = new THREE.Vector3();
  private transformStartQuaternion = new THREE.Quaternion();
  private transformStartPositions = new Map<string, THREE.Vector3>();
  private transformStartWorldQuaternions = new Map<string, THREE.Quaternion>();
  private transformStartSnapshots: ObjectSnapshot[] = [];
  private grid = new THREE.GridHelper(24, 24, 0x47606c, 0x27333b);
  private ambient = new THREE.AmbientLight(0xffffff, defaultEnvironment.ambientIntensity);
  private directional = new THREE.DirectionalLight(
    0xffffff,
    defaultEnvironment.directionalIntensity,
  );
  private loader: GLTFLoader;
  private objLoader = new OBJLoader();
  private dracoLoader: DRACOLoader;
  private history = new EditorHistory();
  private isApplyingHistory = false;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private animationFrame = 0;
  private modelRoot: THREE.Object3D | null = null;
  private objectMap = new Map<string, THREE.Object3D>();
  private selectableMeshes: THREE.Mesh[] = [];
  private originalMaterials = new Map<string, THREE.Material | THREE.Material[]>();
  private realisticOriginalMaterials = new Map<
    string,
    THREE.Material | THREE.Material[]
  >();
  private haLights = new Map<string, HaLightRig>();
  private haCoverAnimations = new Map<string, HaCoverAnimation>();
  private haCoverLastFrameTime = 0;
  private haPanelMarkers = new Map<string, HaPanelMarker>();
  private wallOriginalMaterials = new Map<string, THREE.Material | THREE.Material[]>();
  private weatherConfig: WeatherConfig = defaultWeather;
  private weatherGroup = new THREE.Group();
  private regionGroup = new THREE.Group();
  private regionDraftGroup = new THREE.Group();
  private regions: EditorRegion[] = [];
  private selectedRegionId: string | null = null;
  private regionDrawingEnabled = false;
  private regionDraftPoints: RegionPoint[] = [];
  private regionDraftHoverPoint: RegionPoint | null = null;
  private weatherRain: RainLineEffect | null = null;
  private weatherWind: WindLineEffect | null = null;
  private weatherClouds: WeatherCloud[] = [];
  private weatherLightningLight: THREE.PointLight | null = null;
  private weatherLightningBolt: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial> | null =
    null;
  private weatherLightningSkyFlash: THREE.Sprite | null = null;
  private weatherLightningFlash = 0;
  private weatherLightningBurstFrames = 0;
  private weatherLightningCooldownFrames = 0;
  private lastFrameTime = 0;
  private generatedEnvironmentMap: THREE.Texture | null = null;
  private fpsMeter = new FpsMeter();
  private selectedIds = new Set<string>();
  private selectionBox = new THREE.BoxHelper(new THREE.Object3D(), 0x29d3c4);
  private multiSelectionGroup = new THREE.Group();
  private transformMode: TransformMode = "translate";
  private viewMode: ViewMode = "perspective";
  private appearanceTheme: AppearanceTheme = "dark";
  private previewMode = false;
  private previewCameraMode: PreviewCameraMode = "manual";
  private previewCameraTransition: PreviewCameraTransition | null = null;
  private firstPersonMoveState: FirstPersonMoveState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    fast: false,
  };
  private firstPersonPointerState: FirstPersonPointerState | null = null;
  private firstPersonYaw = 0;
  private firstPersonPitch = 0;
  private firstPersonLastFrame = 0;
  private readonly firstPersonMoveSpeed = 1.65;
  private readonly firstPersonFastMultiplier = 2.4;
  private readonly firstPersonLookSensitivity = 0.0032;
  private environmentConfig: EnvironmentConfig = defaultEnvironment;
  private performanceConfig: PerformanceConfig = defaultPerformance;
  private dragStart: { x: number; y: number } | null = null;
  private pointerDownState: {
    x: number;
    y: number;
    button: number;
    shiftKey: boolean;
  } | null = null;
  private contextMenuPointerDownState: {
    x: number;
    y: number;
    button: number;
  } | null = null;
  private dragBoxElement: HTMLDivElement | null = null;
  private destroyed = false;
  private lastSize = { width: 0, height: 0 };
  private handleContextMenuListener = (event: MouseEvent) => {
    this.handleContextMenu(event);
  };

  constructor(container: HTMLElement, options: ThreeEditorOptions = {}) {
    this.container = container;
    this.options = options;
    this.performanceConfig = {
      renderBackend: options.renderBackend ?? defaultPerformance.renderBackend,
      quality: options.quality ?? defaultPerformance.quality,
      realisticRenderingEnabled:
        options.realisticRenderingEnabled ?? defaultPerformance.realisticRenderingEnabled,
      modelShadowsEnabled: defaultPerformance.modelShadowsEnabled,
    };
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath("/draco/");
    this.loader = new GLTFLoader();
    this.loader.setDRACOLoader(this.dracoLoader);
  }

  async init() {
    RectAreaLightUniformsLib.init();
    this.renderer = await this.createRenderer(this.performanceConfig.renderBackend);
    this.applyRenderQuality();
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = defaultEnvironment.exposure;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(resolveWeatherBackground("none", this.appearanceTheme), 1);
    this.renderer.domElement.className = "h-full w-full outline-none";
    this.container.appendChild(this.renderer.domElement);
    this.updateRealisticRendering();

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
    this.transformControls.setMode(this.transformMode);
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

    this.scene.background = new THREE.Color(
      resolveWeatherBackground("none", this.appearanceTheme),
    );
    this.grid.position.y = 0;
    this.scene.add(this.grid);
    this.directional.position.set(
      defaultEnvironment.directionalPosition.x,
      defaultEnvironment.directionalPosition.y,
      defaultEnvironment.directionalPosition.z,
    );
    this.directional.shadow.camera.left = -12;
    this.directional.shadow.camera.right = 12;
    this.directional.shadow.camera.top = 12;
    this.directional.shadow.camera.bottom = -12;
    this.directional.shadow.bias = -0.0001;
    this.applyRenderQuality();
    this.scene.add(this.ambient, this.directional);
    this.weatherGroup.name = "weather simulation";
    this.scene.add(this.weatherGroup);
    this.regionGroup.name = "editor regions";
    this.regionDraftGroup.name = "editor region draft";
    this.scene.add(this.regionGroup, this.regionDraftGroup);

    this.selectionBox.visible = false;
    this.selectionBox.material.depthTest = false;
    this.selectionBox.renderOrder = 10;
    this.scene.add(this.selectionBox);
    this.scene.add(this.multiSelectionGroup);
    this.scene.add(this.transformPivot);
    this.scene.add(this.transformHelper);

    this.renderer.domElement.addEventListener("pointerdown", this.handlePointerDown);
    this.renderer.domElement.addEventListener("pointermove", this.handlePointerMove);
    this.renderer.domElement.addEventListener(
      "contextmenu",
      this.handleContextMenuListener,
    );
    window.addEventListener("pointerup", this.handlePointerUp);
    window.addEventListener("keydown", this.handleFirstPersonKeyDown);
    window.addEventListener("keyup", this.handleFirstPersonKeyUp);
    this.animate();
  }

  private async createRenderer(renderBackend: RenderBackend) {
    if (renderBackend === "webgpu" && "gpu" in navigator) {
      let renderer: WebGPURenderer | null = null;
      try {
        renderer = new WebGPURenderer({ antialias: true, alpha: true });
        await withTimeout(renderer.init(), 3000, "WebGPU initialization timed out.");
        this.activeRenderBackend = "webgpu";
        return renderer;
      } catch {
        renderer?.dispose();
        this.activeRenderBackend = "webgl";
      }
    }
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.activeRenderBackend = "webgl";
    return renderer;
  }

  setPerformanceConfig(config: PerformanceConfig) {
    const realisticRenderingChanged =
      this.performanceConfig.realisticRenderingEnabled !==
      (config.realisticRenderingEnabled === true);
    const modelShadowsChanged =
      this.performanceConfig.modelShadowsEnabled !==
      (config.modelShadowsEnabled === true);
    this.performanceConfig = {
      renderBackend:
        config.renderBackend === "webgpu" || config.renderBackend === "webgl"
          ? config.renderBackend
          : defaultPerformance.renderBackend,
      quality: config.quality ?? defaultPerformance.quality,
      realisticRenderingEnabled: config.realisticRenderingEnabled === true,
      modelShadowsEnabled: config.modelShadowsEnabled === true,
    };
    this.applyRenderQuality();
    if (realisticRenderingChanged) {
      this.updateRealisticRendering();
    }
    if (modelShadowsChanged && this.modelRoot) {
      this.applyModelShadowFlags(this.modelRoot);
    }
  }

  private applyRenderQuality() {
    if (!this.renderer) {
      return;
    }
    const profile = getRenderQualityProfile(this.performanceConfig.quality);
    const shadowsEnabled =
      profile.shadowEnabled && this.performanceConfig.modelShadowsEnabled;
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, profile.pixelRatioCap),
    );
    this.renderer.shadowMap.enabled = shadowsEnabled;
    this.renderer.shadowMap.type =
      profile.shadowType === "soft" ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
    this.directional.castShadow = shadowsEnabled;
    this.directional.shadow.radius = profile.shadowRadius;
    const mapSizeChanged =
      this.directional.shadow.mapSize.x !== profile.shadowMapSize ||
      this.directional.shadow.mapSize.y !== profile.shadowMapSize;
    this.directional.shadow.mapSize.set(profile.shadowMapSize, profile.shadowMapSize);
    if (this.directional.shadow.map) {
      if (mapSizeChanged || !shadowsEnabled) {
        this.directional.shadow.map.dispose();
        this.directional.shadow.map = null;
      }
    }
    this.directional.shadow.needsUpdate = true;
  }

  private applyStudioEnvironment() {
    if (this.generatedEnvironmentMap) {
      this.generatedEnvironmentMap.dispose();
    }
    const faces = [
      this.createEnvironmentFace("#d7e5f2", "#edf5ff"),
      this.createEnvironmentFace("#202936", "#566a7d"),
      this.createEnvironmentFace("#f4ead8", "#d5b98f"),
      this.createEnvironmentFace("#141a22", "#283443"),
      this.createEnvironmentFace("#b8d0e8", "#fbf7ee"),
      this.createEnvironmentFace("#1b2430", "#53616f"),
    ];
    const texture = new THREE.CubeTexture(faces);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    this.generatedEnvironmentMap = texture;
    this.scene.environment = texture;
    this.scene.environmentIntensity = 0.68;
  }

  private clearStudioEnvironment() {
    this.scene.environment = null;
    this.scene.environmentIntensity = 1;
    this.generatedEnvironmentMap?.dispose();
    this.generatedEnvironmentMap = null;
  }

  private updateRealisticRendering() {
    if (this.performanceConfig.realisticRenderingEnabled) {
      this.applyStudioEnvironment();
      if (this.modelRoot) {
        this.prepareModel(this.modelRoot);
      }
      return;
    }
    this.clearStudioEnvironment();
    this.restoreRealisticMaterials();
    if (this.modelRoot) {
      this.ensureModelMaterialVisibility(this.modelRoot);
    }
  }

  private createEnvironmentFace(topColor: string, bottomColor: string) {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext("2d");
    if (!context) {
      return canvas;
    }
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(1, bottomColor);
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
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
      this.handleContextMenuListener,
    );
    window.removeEventListener("pointerup", this.handlePointerUp);
    window.removeEventListener("keydown", this.handleFirstPersonKeyDown);
    window.removeEventListener("keyup", this.handleFirstPersonKeyUp);
    this.restoreWallTransparency();
    this.clearWeatherEffects();
    this.clearRegionObjects();
    this.clearRegionDraftObjects();
    this.clearHaPanelMarkers();
    if (this.modelRoot) {
      disposeObjectTree(this.modelRoot);
    }
    this.clearHaLights();
    this.generatedEnvironmentMap?.dispose();
    this.generatedEnvironmentMap = null;
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
    removeOwnedElement(this.container, this.renderer?.domElement ?? null);
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
      const root = await this.loadObjectFromUrl(
        url,
        file.name.replace(/\.(glb|gltf|obj)$/i, ""),
        file.name,
      );
      ensureModelObjectIds(root);
      this.prepareModel(root);
      this.modelRoot = root;
      this.scene.add(root);
      this.rebuildObjectMap();
      this.frameObject(root);
      this.setViewMode(this.viewMode);
      this.rebuildWeatherEffects();
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
    this.rebuildWeatherEffects();
    this.options.onModelChange?.();
    this.options.onLoadProgress?.(1);
    return root;
  }

  async addModelFromUrl(
    url: string,
    name = "model",
    placement?: { clientX: number; clientY: number },
  ) {
    const object = await this.loadObjectFromUrl(url, name);
    return this.addModelObject(object, name, placement);
  }

  async addModelFromFile(file: File) {
    const url = URL.createObjectURL(file);
    const name = file.name.replace(/\.(glb|gltf|obj)$/i, "");
    try {
      const object = await this.loadObjectFromUrl(url, name, file.name);
      return this.addModelObject(object, name);
    } finally {
      URL.revokeObjectURL(url);
      this.options.onLoadProgress?.(1);
    }
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

  setRegions(regions: EditorRegion[], selectedRegionId: string | null = this.selectedRegionId) {
    const hadSelectedRegion = Boolean(this.selectedRegionId);
    this.regions = regions;
    this.selectedRegionId =
      selectedRegionId &&
      regions.some((region) => region.id === selectedRegionId && !region.hidden)
        ? selectedRegionId
        : null;
    this.rebuildRegionObjects();
    if (hadSelectedRegion && !this.selectedRegionId) {
      this.restoreOrbitTargetToGridCenter();
    }
  }

  beginRegionDrawing() {
    this.regionDrawingEnabled = true;
    this.regionDraftPoints = [];
    this.regionDraftHoverPoint = null;
    this.updateRegionDraftObjects();
    this.options.onRegionDraftChange?.(0);
  }

  cancelRegionDrawing() {
    this.regionDrawingEnabled = false;
    this.regionDraftPoints = [];
    this.regionDraftHoverPoint = null;
    this.updateRegionDraftObjects();
    this.options.onRegionDraftChange?.(0);
  }

  completeRegionDrawing(name: string) {
    if (this.regionDraftPoints.length < 4) {
      return null;
    }
    const firstPoint = this.regionDraftPoints[0];
    const lastPoint = this.regionDraftPoints[this.regionDraftPoints.length - 1];
    const closedDistance = Math.hypot(
      lastPoint.x - firstPoint.x,
      lastPoint.z - firstPoint.z,
    );
    if (closedDistance > REGION_CLOSE_THRESHOLD) {
      return null;
    }
    const polygonPoints = this.regionDraftPoints.slice(0, -1);
    const region: EditorRegion = {
      id: `region-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim() || "未命名区域",
      highlightMode: "edges",
      points: polygonPoints.map((point) => ({ ...point })),
    };
    this.regionDrawingEnabled = false;
    this.regionDraftPoints = [];
    this.regionDraftHoverPoint = null;
    this.updateRegionDraftObjects();
    this.options.onRegionDraftChange?.(0);
    return region;
  }

  getRegionDraftPointCount() {
    return this.regionDraftPoints.length;
  }

  focusRegion(regionId: string) {
    const region = this.regions.find((item) => item.id === regionId);
    if (!region || region.hidden) {
      return false;
    }
    this.selectedRegionId = region.id;
    this.rebuildRegionObjects();
    this.focusCameraOnRegion(region);
    return true;
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
    const selectedObjects = this.getSelectedObjects();
    this.clearHaCoverAnimationsForObjects(selectedObjects);
    const before = this.captureSnapshots(selectedObjects);
    let deleted = false;
    const objects = [...this.selectedIds]
      .map((id) => this.objectMap.get(id))
      .filter((object): object is THREE.Object3D => Boolean(object))
      .filter((object) => object !== this.modelRoot && Boolean(object.parent));

    for (const object of objects) {
      this.clearHaCoverAnimationForObject(object);
      this.clearHaLightForObject(object.uuid);
      object.parent?.remove(object);
      disposeObjectTree(object);
      deleted = true;
    }

    if (!deleted) {
      return false;
    }
    this.selectedIds.clear();
    if (this.modelRoot) {
      this.updateDirectionalShadowBounds(this.modelRoot);
    }
    this.rebuildObjectMap();
    this.updateSelectionBox();
    this.updateTransformControls();
    this.options.onSelectionChange?.([]);
    this.options.onModelChange?.();
    const after = this.captureSnapshots(before.map((snapshot) => snapshot.object));
    this.pushTransformHistory("删除零件", before, after, []);
    return true;
  }

  duplicateSelected() {
    if (this.selectedIds.size !== 1 || !this.modelRoot) {
      return false;
    }
    const [selectedId] = [...this.selectedIds];
    const source = this.objectMap.get(selectedId);
    if (!source || source === this.modelRoot || !source.parent) {
      return false;
    }
    this.clearHaCoverAnimationForObject(source);
    const parent = source.parent;
    const clone = source.clone(true);
    clone.name = source.name ? `${source.name} 副本` : "模型副本";
    assignFreshModelObjectIds(
      clone,
      [...this.objectMap.values()].map((object) => getModelObjectId(object)),
    );
    const beforeSelectedIds = [...this.selectedIds];
    parent.add(clone);
    const box = new THREE.Box3().setFromObject(source);
    const size = box.getSize(new THREE.Vector3());
    clone.position.x += Math.max(size.x * 0.18, 0.2);
    clone.position.z += Math.max(size.z * 0.18, 0.2);
    this.prepareModel(clone);
    if (this.modelRoot) {
      this.updateDirectionalShadowBounds(this.modelRoot);
    }
    this.rebuildObjectMap();
    this.selectedIds = new Set([clone.uuid]);
    this.updateSelectionBox();
    this.updateTransformControls();
    this.options.onSelectionChange?.([clone.uuid]);
    this.options.onModelChange?.();
    this.history.push({
      label: "复制模型",
      undo: () => {
        clone.parent?.remove(clone);
        if (this.modelRoot) {
          this.updateDirectionalShadowBounds(this.modelRoot);
        }
        this.rebuildObjectMap();
        this.selectedIds = new Set(beforeSelectedIds.filter((id) => this.objectMap.has(id)));
        this.updateSelectionBox();
        this.updateTransformControls();
        this.options.onSelectionChange?.([...this.selectedIds]);
        this.options.onModelChange?.();
      },
      redo: () => {
        parent.add(clone);
        if (this.modelRoot) {
          this.updateDirectionalShadowBounds(this.modelRoot);
        }
        this.rebuildObjectMap();
        this.selectedIds = new Set([clone.uuid]);
        this.updateSelectionBox();
        this.updateTransformControls();
        this.options.onSelectionChange?.([clone.uuid]);
        this.options.onModelChange?.();
      },
    });
    this.options.onHistoryChange?.(this.history.getState());
    return true;
  }

  updatePosition(uuid: string, position: Vector3Values) {
    const object = this.objectMap.get(uuid);
    if (!object) {
      return;
    }
    this.clearHaCoverAnimationForObject(object);
    const before = this.captureSnapshots([object]);
    object.position.set(position.x, position.y, position.z);
    this.updateSelectionBox();
    this.updateTransformControls();
    if (this.modelRoot) {
      this.updateDirectionalShadowBounds(this.modelRoot);
    }
    this.options.onModelChange?.();
    this.pushTransformHistory("移动零件", before, this.captureSnapshots([object]));
  }

  updateSelectionScale(scale: Vector3Values) {
    const objects = this.getSelectedObjects();
    if (objects.length !== 1) {
      return;
    }
    this.clearHaCoverAnimationsForObjects(objects);
    const before = this.captureSnapshots(objects);
    objects[0].scale.set(
      Math.max(scale.x, 0.001),
      Math.max(scale.y, 0.001),
      Math.max(scale.z, 0.001),
    );
    this.updateSelectionBox();
    this.updateTransformControls();
    if (this.modelRoot) {
      this.updateDirectionalShadowBounds(this.modelRoot);
    }
    this.options.onModelChange?.();
    this.pushTransformHistory("缩放零件", before, this.captureSnapshots(objects));
  }

  resizeSelection(targetSize: Vector3Values) {
    const objects = this.getSelectedObjects();
    this.clearHaCoverAnimationsForObjects(objects);
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
    if (this.modelRoot) {
      this.updateDirectionalShadowBounds(this.modelRoot);
    }
    this.pushTransformHistory("调整尺寸", before, this.captureSnapshots(objects));
  }

  updateSelectionCenter(targetCenter: Vector3Values) {
    const objects = this.getSelectedObjects();
    this.clearHaCoverAnimationsForObjects(objects);
    const box = this.getSelectionBox(objects);
    if (!box) {
      return;
    }
    const currentCenter = box.getCenter(new THREE.Vector3());
    const nextCenter = new THREE.Vector3(targetCenter.x, targetCenter.y, targetCenter.z);
    const delta = nextCenter.sub(currentCenter);
    if (delta.lengthSq() === 0) {
      return;
    }
    const before = this.captureSnapshots(objects);
    this.translateObjectsByWorldDelta(objects, delta);
    this.updateSelectionBox();
    this.updateTransformControls();
    if (this.modelRoot) {
      this.updateDirectionalShadowBounds(this.modelRoot);
    }
    this.options.onModelChange?.();
    this.pushTransformHistory("移动中心点", before, this.captureSnapshots(objects));
  }

  nudgeSelection(delta: Vector3Values) {
    const objects = this.getSelectedObjects();
    if (objects.length === 0) {
      return false;
    }
    this.clearHaCoverAnimationsForObjects(objects);
    const before = this.captureSnapshots(objects);
    this.translateObjectsByWorldDelta(
      objects,
      new THREE.Vector3(delta.x, delta.y, delta.z),
    );
    this.updateSelectionBox();
    this.updateTransformControls();
    if (this.modelRoot) {
      this.updateDirectionalShadowBounds(this.modelRoot);
    }
    this.options.onModelChange?.();
    this.pushTransformHistory("微调移动", before, this.captureSnapshots(objects));
    return true;
  }

  rotateSelection(rotation: Vector3Values) {
    const objects = this.getSelectedObjects();
    const box = this.getSelectionBox(objects);
    if (!box) {
      return false;
    }
    this.clearHaCoverAnimationsForObjects(objects);
    const before = this.captureSnapshots(objects);
    const rotationDelta = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rotation.x, rotation.y, rotation.z, "XYZ"),
    );
    this.rotateObjectsAroundWorldCenter(
      objects,
      box.getCenter(new THREE.Vector3()),
      rotationDelta,
    );
    this.updateSelectionBox();
    this.updateTransformControls();
    if (this.modelRoot) {
      this.updateDirectionalShadowBounds(this.modelRoot);
    }
    this.options.onModelChange?.();
    this.pushTransformHistory("旋转零件", before, this.captureSnapshots(objects));
    return true;
  }

  updateSelectionRotation(rotation: Vector3Values) {
    const objects = this.getSelectedObjects();
    if (objects.length !== 1) {
      return false;
    }
    this.clearHaCoverAnimationsForObjects(objects);
    const before = this.captureSnapshots(objects);
    objects[0].rotation.set(rotation.x, rotation.y, rotation.z);
    this.updateSelectionBox();
    this.updateTransformControls();
    if (this.modelRoot) {
      this.updateDirectionalShadowBounds(this.modelRoot);
    }
    this.options.onModelChange?.();
    this.pushTransformHistory("旋转零件", before, this.captureSnapshots(objects));
    return true;
  }

  setTransformMode(mode: TransformMode) {
    this.transformMode = mode;
    this.transformControls?.setMode(mode);
    this.updateTransformControls();
  }

  scaleSelectionUniform(multiplier: number) {
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      return;
    }
    const objects = this.getSelectedObjects();
    this.clearHaCoverAnimationsForObjects(objects);
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
    if (this.modelRoot) {
      this.updateDirectionalShadowBounds(this.modelRoot);
    }
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

  createLocalConfig(
    environment: EnvironmentConfig,
    weather: WeatherConfig,
    ha: HaRuntimeConfig,
    performance: PerformanceConfig,
    regions: EditorRegion[] = this.regions,
    appearance = { theme: this.appearanceTheme },
  ) {
    if (!this.modelRoot) {
      return null;
    }
    return createEditorLocalConfig(
      this.modelRoot,
      environment,
      weather,
      ha,
      performance,
      regions,
      appearance,
    );
  }

  applyLocalConfig(config: EditorLocalConfig | null) {
    if (!this.modelRoot) {
      return;
    }
    applyEditorLocalConfig(this.modelRoot, config);
    syncAllCoverTargetBindings(this.modelRoot);
    this.rebuildObjectMap();
    this.options.onModelChange?.();
  }

  getSelectedBindings() {
    return this.getSelectedObjects().flatMap((object) => getObjectBindings(object));
  }

  getBindingsForObjects(objectIds: string[]) {
    return objectIds
      .map((id) => this.objectMap.get(id))
      .filter((object): object is THREE.Object3D => Boolean(object))
      .flatMap((object) => getObjectBindings(object));
  }

  getLightCapabilityForObjects(objectIds: string[]) {
    for (const objectId of objectIds) {
      const object = this.objectMap.get(objectId);
      if (!object) {
        continue;
      }
      const config = getLightCapabilityConfig(object);
      if (config) {
        return config;
      }
    }
    return null;
  }

  getCoverCapabilityForObjects(objectIds: string[]) {
    for (const objectId of objectIds) {
      const object = this.objectMap.get(objectId);
      if (!object) {
        continue;
      }
      const config = getCoverCapabilityConfig(object);
      if (config) {
        return config;
      }
    }
    return null;
  }

  getResolvedRegionIdForObject(objectId: string) {
    const object = this.objectMap.get(objectId);
    return object ? this.resolveObjectRegionId(object) : null;
  }

  updateRegionAssignmentForSelection(
    assignment: ReturnType<typeof getObjectRegionAssignment>,
  ) {
    const objects = this.getSelectedObjects();
    if (objects.length === 0) {
      return;
    }
    for (const object of objects) {
      setObjectRegionAssignment(object, assignment);
    }
    this.options.onModelChange?.();
  }

  private getValidRegionIds(regions: EditorRegion[] = this.regions ?? []) {
    return new Set(regions.map((region) => region.id));
  }

  private findRegionIdAtObjectPosition(
    object: THREE.Object3D,
    regions: EditorRegion[] = this.regions ?? [],
  ) {
    if (regions.length === 0) {
      return null;
    }
    object.updateWorldMatrix(true, false);
    const position = object.getWorldPosition(new THREE.Vector3());
    const region = regions.find(
      (item) =>
        !item.hidden &&
        isPointInEditorRegion({ x: position.x, z: position.z }, item),
    );
    return region?.id ?? null;
  }

  private resolveObjectRegionId(
    object: THREE.Object3D,
    regions: EditorRegion[] = this.regions ?? [],
  ) {
    const validRegionIds = this.getValidRegionIds(regions);
    const assignment = getObjectRegionAssignment(object);
    if (
      assignment.mode === "manual" &&
      assignment.regionId &&
      validRegionIds.has(assignment.regionId)
    ) {
      return assignment.regionId;
    }
    if (
      assignment.mode === "auto" &&
      assignment.initialized &&
      (!assignment.regionId || validRegionIds.has(assignment.regionId))
    ) {
      return assignment.regionId;
    }
    if (regions.length === 0) {
      setObjectRegionAssignment(object, {
        mode: "auto",
        regionId: null,
        initialized: false,
      });
      return null;
    }
    const regionId = this.findRegionIdAtObjectPosition(object, regions);
    setObjectRegionAssignment(object, {
      mode: "auto",
      regionId,
      initialized: true,
    });
    return regionId;
  }

  getRegionDevicePanelItems(region: EditorRegion) {
    const regions = this.regions?.length ? this.regions : [region];
    return [...this.objectMap.values()]
      .filter((object) => object !== this.modelRoot)
      .map((object) => {
        const bindings = getObjectBindings(object);
        return { object, bindings };
      })
      .filter(({ bindings }) => getBoundEntityIds(bindings).length > 0)
      .filter(({ object }) => this.resolveObjectRegionId(object, regions) === region.id)
      .map(({ object, bindings }) => ({
        id: object.uuid,
        name: object.name?.trim() || getModelObjectId(object) || object.type,
        objectIds: [object.uuid],
        bindings,
        coverCapability: getCoverCapabilityConfig(object),
        lightCapability: getLightCapabilityConfig(object),
      }));
  }

  updateCoverCapabilityForSelection(config: HaCoverCapabilityConfig) {
    const objects = this.getSelectedObjects();
    if (objects.length === 0) {
      return;
    }
    for (const object of objects) {
      this.clearHaCoverAnimationForObject(object);
      setCoverCapabilityConfig(object, config);
      if (this.modelRoot) {
        syncCoverTargetBindings(this.modelRoot, object, config);
      }
    }
    this.history.push({
      label: "配置窗帘动画",
      undo: () => undefined,
      redo: () => undefined,
    });
    this.options.onHistoryChange?.(this.history.getState());
    this.options.onModelChange?.();
  }

  updateLightCapabilityForSelection(config: HaLightCapabilityConfig) {
    const objects = this.getSelectedObjects();
    if (objects.length === 0) {
      return;
    }
    for (const object of objects) {
      setLightCapabilityConfig(object, config);
    }
    this.history.push({
      label: "配置灯光能力",
      undo: () => undefined,
      redo: () => undefined,
    });
    this.options.onHistoryChange?.(this.history.getState());
    this.options.onModelChange?.();
  }

  updateManualDeviceTypeForSelection(deviceType: HaManualDeviceType) {
    const objects = this.getSelectedObjects();
    if (objects.length === 0) {
      return;
    }
    for (const object of objects) {
      setManualDeviceType(object, deviceType);
      if (deviceType === "cover" && !getCoverCapabilityConfig(object)) {
        setCoverCapabilityConfig(object, defaultCoverCapabilityConfig());
      }
      if (deviceType === "light" && !getLightCapabilityConfig(object)) {
        setLightCapabilityConfig(object, {
          enabled: true,
          lightType: "point",
          emissionMode: "whole",
          coneAngle: 45,
          maxIntensity: 8,
          lightRange: 14,
          maxBrightness: 255,
          fixedColorTemperatureKelvin: 3000,
        });
      }
    }
    this.history.push({
      label: "配置设备类型",
      undo: () => undefined,
      redo: () => undefined,
    });
    this.options.onHistoryChange?.(this.history.getState());
    this.options.onModelChange?.();
  }

  updateBindingsForSelection(bindings: HaBinding[]) {
    const objects = this.getSelectedObjects();
    if (objects.length === 0) {
      return;
    }
    for (const object of objects) {
      setObjectBindings(object, bindings);
      const coverConfig = getCoverCapabilityConfig(object);
      if (this.modelRoot && coverConfig) {
        syncCoverTargetBindings(this.modelRoot, object, coverConfig);
      }
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

    const activeCoverIds = new Set<string>();
    this.modelRoot.traverse((object) => {
      const bindings = getObjectBindings(object);
      const coverConfig = getCoverCapabilityConfig(object);
      const lightConfig = getLightCapabilityConfig(object);
      if (bindings.length === 0 && !lightConfig && !coverConfig) {
        return;
      }
      const boundEntityIds = getBoundEntityIds(bindings);
      if (coverConfig?.enabled) {
        const targetPositionPercent = resolveCoverPositionPercent(boundEntityIds, states);
        for (const target of this.resolveCoverAnimationTargets(object, coverConfig)) {
          activeCoverIds.add(target.object.uuid);
          this.ensureHaCoverAnimation(target.object, target.config, targetPositionPercent);
        }
      }
      const light = resolveLightCapability({
        config: lightConfig,
        entityIds: boundEntityIds,
        states,
      });
      if (light.enabled && light.isOn) {
        this.enableObjectEmission(object, light);
      } else {
        this.disableObjectEmission(object);
      }
    });
    this.removeInactiveHaCoverAnimations(activeCoverIds);
  }

  getSelectionScreenAnchor() {
    return this.getScreenAnchorForObjects([...this.selectedIds]);
  }

  getScreenAnchorForObjects(objectIds: string[]) {
    if (!this.renderer) {
      return null;
    }
    const objects = objectIds
      .map((id) => this.objectMap.get(id))
      .filter((object): object is THREE.Object3D => Boolean(object));
    const box = this.getSelectionBox(objects);
    if (!box) {
      return null;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    const camera = this.getActiveCamera();
    const corners = [
      new THREE.Vector3(box.min.x, box.min.y, box.min.z),
      new THREE.Vector3(box.min.x, box.min.y, box.max.z),
      new THREE.Vector3(box.min.x, box.max.y, box.min.z),
      new THREE.Vector3(box.min.x, box.max.y, box.max.z),
      new THREE.Vector3(box.max.x, box.min.y, box.min.z),
      new THREE.Vector3(box.max.x, box.min.y, box.max.z),
      new THREE.Vector3(box.max.x, box.max.y, box.min.z),
      new THREE.Vector3(box.max.x, box.max.y, box.max.z),
    ];
    const points = corners.map((corner) => {
      const projected = corner.project(camera);
      return {
        x: rect.left + ((projected.x + 1) / 2) * rect.width,
        y: rect.top + ((1 - projected.y) / 2) * rect.height,
      };
    });
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    return {
      x: (minX + maxX) / 2,
      y: minY,
    };
  }

  setHaPanelMarkers(markers: Array<{ id: string; objectIds: string[] }>) {
    const nextIds = new Set(markers.map((marker) => marker.id));
    for (const [id, marker] of this.haPanelMarkers) {
      if (!nextIds.has(id)) {
        this.disposeHaPanelMarker(marker);
        this.haPanelMarkers.delete(id);
      }
    }

    for (const marker of markers) {
      const existing = this.haPanelMarkers.get(marker.id);
      if (existing) {
        existing.objectIds = marker.objectIds;
        continue;
      }
      this.haPanelMarkers.set(
        marker.id,
        this.createHaPanelMarker(marker.id, marker.objectIds),
      );
    }
    this.updateHaPanelMarkers();
  }

  markSaved() {
    this.history.markSaved();
    this.options.onHistoryChange?.(this.history.getState());
  }

  setEnvironment(config: EnvironmentConfig) {
    this.environmentConfig = config;
    this.directional.position.set(
      config.directionalPosition.x,
      config.directionalPosition.y,
      config.directionalPosition.z,
    );
    this.grid.visible = config.gridVisible;
    this.applyWeatherAtmosphere();
    this.updateWallTransparency();
  }

  setWeather(config: WeatherConfig) {
    const modeChanged = this.weatherConfig.mode !== config.mode;
    this.weatherConfig = config;
    if (!modeChanged) {
      this.applyWeatherAtmosphere();
      return;
    }
    this.rebuildWeatherEffects();
    this.applyWeatherAtmosphere();
  }

  setAppearanceTheme(theme: AppearanceTheme) {
    this.appearanceTheme = theme;
    this.applyWeatherAtmosphere();
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
      if (this.previewCameraMode === "firstPerson") {
        this.enterFirstPersonMode();
      }
      return;
    }
    this.exitFirstPersonMode();
    this.previewCameraTransition = null;
    this.updateSelectionBox();
    this.updateTransformControls();
    this.updateWallTransparency();
  }

  setPreviewCameraMode(mode: PreviewCameraMode) {
    const wasFirstPerson = this.previewCameraMode === "firstPerson";
    this.previewCameraMode = mode;
    if (mode === "firstPerson") {
      if (this.previewMode) {
        this.enterFirstPersonMode();
      }
      return;
    }
    if (wasFirstPerson) {
      this.exitFirstPersonMode();
    }
    if (mode === "manual") {
      this.previewCameraTransition = null;
    }
  }

  setFirstPersonMoveDirection(direction: FirstPersonDirection, active: boolean) {
    this.firstPersonMoveState[direction] = active;
  }

  setViewMode(mode: ViewMode) {
    if (mode !== "perspective" && this.previewCameraMode === "firstPerson") {
      this.exitFirstPersonMode();
    }
    this.viewMode = mode;
    this.previewCameraTransition = null;
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

  async exportGlb(options: { compressed?: boolean } = {}) {
    if (!this.modelRoot) {
      throw new Error("No model loaded.");
    }
    const exporter = new GLTFExporter();
    this.restoreWallTransparency();
    this.restoreHaCoverAnimationsForExport();
    const exportRoot = this.modelRoot.clone(true);
    this.sanitizeModelGeometry(exportRoot);
    try {
      const result = await exporter.parseAsync(exportRoot, { binary: true });
      let arrayBuffer: ArrayBuffer;
      if (result instanceof ArrayBuffer) {
        arrayBuffer = result;
      } else {
        arrayBuffer = new TextEncoder().encode(JSON.stringify(result)).buffer;
      }
      const output = options.compressed
        ? await compressGlbWithDraco(arrayBuffer)
        : arrayBuffer;
      return new Blob([output], { type: "model/gltf-binary" });
    } finally {
      this.reapplyHaCoverAnimationsAfterExport();
      this.updateWallTransparency();
    }
  }

  private clearModel() {
    this.selectObject(null);
    this.restoreWallTransparency();
    this.clearHaCoverAnimations();
    this.clearHaLights();
    this.clearHaPanelMarkers();
    this.originalMaterials.clear();
    this.realisticOriginalMaterials.clear();
    if (this.modelRoot) {
      this.scene.remove(this.modelRoot);
      disposeObjectTree(this.modelRoot);
    }
    this.modelRoot = null;
    this.objectMap.clear();
    this.selectableMeshes = [];
    this.rebuildWeatherEffects();
    this.options.onModelChange?.();
  }

  private clearHistory() {
    this.history.clear();
    this.options.onHistoryChange?.(this.history.getState());
  }

  private async loadObjectFromUrl(url: string, name: string, filename = url) {
    if (/\.(obj)(?:$|\?)/i.test(filename)) {
      const object = await this.objLoader.loadAsync(url, (event) => {
        if (event.total > 0) {
          this.options.onLoadProgress?.(event.loaded / event.total);
        }
      });
      object.name = object.name || name;
      this.options.onLoadProgress?.(1);
      return object;
    }

    if (!/\.(glb|gltf)(?:$|\?)/i.test(filename)) {
      throw new Error("仅支持加载 .glb、.gltf 或 .obj 模型文件。");
    }

    const gltf = await this.loader.loadAsync(url, (event) => {
      if (event.total > 0) {
        this.options.onLoadProgress?.(event.loaded / event.total);
      }
    });
    const root = gltf.scene;
    root.name = root.name || name;
    this.options.onLoadProgress?.(1);
    return root;
  }

  private ensureModelRoot() {
    if (this.modelRoot) {
      return this.modelRoot;
    }
    const root = new THREE.Group();
    root.name = "模型场景";
    ensureModelObjectIds(root);
    this.modelRoot = root;
    this.scene.add(root);
    return root;
  }

  private getModelContentBox(excluded?: THREE.Object3D) {
    if (!this.modelRoot) {
      return null;
    }
    const box = new THREE.Box3();
    let hasContent = false;
    this.modelRoot.traverse((node) => {
      if (node === excluded || (excluded && node.parent === excluded)) {
        return;
      }
      if ((node as THREE.Mesh).isMesh) {
        box.expandByObject(node);
        hasContent = true;
      }
    });
    return hasContent && !box.isEmpty() ? box : null;
  }

  private resolveDropPointOnGround(clientX: number, clientY: number) {
    if (!this.renderer || !this.camera) {
      return null;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const groundY = this.getModelContentBox()?.min.y ?? 0;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -groundY);
    const point = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(plane, point) ? point : null;
  }

  private resolveDefaultAddPoint(object: THREE.Object3D) {
    const contentBox = this.getModelContentBox(object);
    if (!contentBox) {
      return new THREE.Vector3(0, 0, 0);
    }
    const size = contentBox.getSize(new THREE.Vector3());
    const margin = Math.max(Math.min(Math.max(size.x, size.z) * 0.08, 2), 0.5);
    return new THREE.Vector3(
      contentBox.max.x + margin,
      contentBox.min.y,
      contentBox.getCenter(new THREE.Vector3()).z,
    );
  }

  private placeAddedModelObject(
    object: THREE.Object3D,
    placement?: { clientX: number; clientY: number },
  ) {
    const objectBox = new THREE.Box3().setFromObject(object);
    if (objectBox.isEmpty()) {
      return;
    }
    const objectCenter = objectBox.getCenter(new THREE.Vector3());
    const objectBottom = objectBox.min.y;
    const target =
      placement
        ? this.resolveDropPointOnGround(placement.clientX, placement.clientY) ??
          this.resolveDefaultAddPoint(object)
        : this.resolveDefaultAddPoint(object);
    const delta = new THREE.Vector3(
      target.x - objectCenter.x,
      target.y - objectBottom,
      target.z - objectCenter.z,
    );
    object.position.add(delta);
  }

  private addModelObject(
    object: THREE.Object3D,
    name: string,
    placement?: { clientX: number; clientY: number },
  ) {
    const root = this.ensureModelRoot();
    object.name = object.name || name;
    ensureModelObjectIds(object);
    this.prepareModel(object);
    this.placeAddedModelObject(object, placement);
    root.add(object);
    this.updateDirectionalShadowBounds(root);
    this.rebuildObjectMap();
    this.setViewMode(this.viewMode);
    this.rebuildWeatherEffects();
    this.selectObject(object.uuid);
    this.history.push({
      label: "添加模型",
      undo: () => {
        object.parent?.remove(object);
        this.updateDirectionalShadowBounds(root);
        this.rebuildObjectMap();
        this.selectObject(null);
        this.rebuildWeatherEffects();
        this.options.onModelChange?.();
      },
      redo: () => {
        root.add(object);
        this.updateDirectionalShadowBounds(root);
        this.rebuildObjectMap();
        this.selectObject(object.uuid);
        this.rebuildWeatherEffects();
        this.options.onModelChange?.();
      },
    });
    this.options.onHistoryChange?.(this.history.getState());
    this.options.onModelChange?.();
    return object;
  }

  private prepareModel(root: THREE.Object3D) {
    root.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        const lightReactiveMaterial = this.ensureLightReactiveMaterial(mesh.material);
        mesh.material = this.performanceConfig.realisticRenderingEnabled
          ? this.enhanceRealisticMaterialSet(mesh, lightReactiveMaterial)
          : lightReactiveMaterial;
        this.ensureMeshMaterialVisibility(mesh);
        mesh.userData.selectable = true;
      }
    });
    this.applyModelShadowFlags(root);
    this.updateDirectionalShadowBounds(root);
  }

  private ensureModelMaterialVisibility(root: THREE.Object3D) {
    root.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }
      this.ensureMeshMaterialVisibility(mesh);
    });
  }

  private ensureMeshMaterialVisibility(mesh: THREE.Mesh) {
    makeMaterialOpaque(mesh.material);
    const geometry = mesh.geometry;
    if (!geometry) {
      return;
    }
    if (!geometry.boundingBox) {
      geometry.computeBoundingBox();
    }
    const box = geometry.boundingBox;
    if (!box || box.isEmpty()) {
      return;
    }
    const size = box.getSize(new THREE.Vector3());
    const scale = mesh.getWorldScale(new THREE.Vector3());
    size.set(
      Math.abs(size.x * scale.x),
      Math.abs(size.y * scale.y),
      Math.abs(size.z * scale.z),
    );
    if (shouldUseDoubleSidedMaterial(size)) {
      makeMaterialDoubleSided(mesh.material);
    }
  }

  private applyModelShadowFlags(root: THREE.Object3D) {
    const enabled = this.performanceConfig.modelShadowsEnabled;
    root.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }
      mesh.castShadow = enabled;
      mesh.receiveShadow = enabled;
    });
    this.directional.shadow.needsUpdate = true;
  }

  private ensureHaCoverAnimation(
    object: THREE.Object3D,
    config: HaCoverCapabilityConfig,
    targetPositionPercent: number,
  ) {
    const existing = this.haCoverAnimations.get(object.uuid);
    if (existing) {
      existing.config = config;
      existing.targetPositionPercent = targetPositionPercent;
      return existing;
    }

    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) {
      return null;
    }
    const localObject = object.clone(true);
    localObject.position.set(0, 0, 0);
    localObject.updateMatrixWorld(true);
    const localBox = new THREE.Box3().setFromObject(localObject);
    const animation: HaCoverAnimation = {
      object,
      config,
      currentPositionPercent: targetPositionPercent,
      targetPositionPercent,
      restPosition: object.position.clone(),
      restScale: object.scale.clone(),
      size: box.getSize(new THREE.Vector3()),
      localBounds: {
        min: localBox.min.clone(),
        max: localBox.max.clone(),
      },
    };
    this.haCoverAnimations.set(object.uuid, animation);
    this.applyHaCoverAnimation(animation);
    return animation;
  }

  private resolveCoverAnimationTargets(
    object: THREE.Object3D,
    config: HaCoverCapabilityConfig,
  ) {
    if (config.openMode !== "symmetrical") {
      return [{ object, config }];
    }
    const leftObject = config.leftObjectId
      ? this.findObjectByModelObjectId(config.leftObjectId)
      : null;
    const rightObject = config.rightObjectId
      ? this.findObjectByModelObjectId(config.rightObjectId)
      : null;
    if (!leftObject && !rightObject) {
      return [{ object, config }];
    }
    const targets: Array<{ object: THREE.Object3D; config: HaCoverCapabilityConfig }> = [];
    if (leftObject) {
      targets.push({
        object: leftObject,
        config: { ...config, openMode: resolveSymmetricalCoverTargetMode("left") },
      });
    }
    if (rightObject) {
      targets.push({
        object: rightObject,
        config: { ...config, openMode: resolveSymmetricalCoverTargetMode("right") },
      });
    }
    return targets;
  }

  private findObjectByModelObjectId(objectId: string) {
    const normalized = objectId.trim();
    if (!normalized) {
      return null;
    }
    for (const object of this.objectMap.values()) {
      if (getModelObjectId(object) === normalized) {
        return object;
      }
    }
    return null;
  }

  private removeInactiveHaCoverAnimations(activeIds: Set<string>) {
    for (const [uuid, animation] of this.haCoverAnimations) {
      if (activeIds.has(uuid)) {
        continue;
      }
      this.restoreHaCoverAnimation(animation);
      this.haCoverAnimations.delete(uuid);
    }
  }

  private restoreHaCoverAnimation(animation: HaCoverAnimation) {
    animation.object.position.copy(animation.restPosition);
    animation.object.scale.copy(animation.restScale);
    animation.object.updateMatrixWorld(true);
  }

  private clearHaCoverAnimations() {
    for (const animation of this.haCoverAnimations.values()) {
      this.restoreHaCoverAnimation(animation);
    }
    this.haCoverAnimations.clear();
  }

  private clearHaCoverAnimationForObject(object: THREE.Object3D) {
    const objectIds = new Set([object.uuid]);
    const config = getCoverCapabilityConfig(object);
    if (config) {
      for (const target of this.resolveCoverAnimationTargets(object, config)) {
        objectIds.add(target.object.uuid);
      }
    }
    for (const uuid of objectIds) {
      const animation = this.haCoverAnimations.get(uuid);
      if (!animation) {
        continue;
      }
      this.restoreHaCoverAnimation(animation);
      this.haCoverAnimations.delete(uuid);
    }
  }

  private clearHaCoverAnimationsForObjects(objects: THREE.Object3D[]) {
    for (const object of objects) {
      this.clearHaCoverAnimationForObject(object);
    }
  }

  private restoreHaCoverAnimationsForExport() {
    for (const animation of this.haCoverAnimations.values()) {
      this.restoreHaCoverAnimation(animation);
    }
  }

  private reapplyHaCoverAnimationsAfterExport() {
    for (const animation of this.haCoverAnimations.values()) {
      this.applyHaCoverAnimation(animation);
    }
  }

  private applyHaCoverAnimation(animation: HaCoverAnimation) {
    const transform = resolveCoverAnimationTransform({
      config: animation.config,
      positionPercent: animation.currentPositionPercent,
      size: {
        x: animation.size.x,
        y: animation.size.y,
        z: animation.size.z,
      },
      localBounds: {
        min: {
          x: animation.localBounds.min.x,
          y: animation.localBounds.min.y,
          z: animation.localBounds.min.z,
        },
        max: {
          x: animation.localBounds.max.x,
          y: animation.localBounds.max.y,
          z: animation.localBounds.max.z,
        },
      },
    });
    animation.object.position.set(
      animation.restPosition.x + transform.offset.x,
      animation.restPosition.y + transform.offset.y,
      animation.restPosition.z + transform.offset.z,
    );
    animation.object.scale.set(
      Math.max(animation.restScale.x * transform.scale.x, 0.001),
      Math.max(animation.restScale.y * transform.scale.y, 0.001),
      Math.max(animation.restScale.z * transform.scale.z, 0.001),
    );
    animation.object.updateMatrixWorld(true);
  }

  private updateHaCoverAnimations() {
    const now = performance.now();
    if (this.haCoverAnimations.size === 0) {
      this.haCoverLastFrameTime = now;
      return;
    }
    const deltaSeconds =
      this.haCoverLastFrameTime > 0
        ? Math.min((now - this.haCoverLastFrameTime) / 1000, 0.1)
        : 1 / 60;
    this.haCoverLastFrameTime = now;
    for (const animation of this.haCoverAnimations.values()) {
      const delta = animation.targetPositionPercent - animation.currentPositionPercent;
      const step = resolveCoverAnimationStepPercent({
        config: animation.config,
        size: {
          x: animation.size.x,
          y: animation.size.y,
          z: animation.size.z,
        },
        deltaSeconds,
      });
      if (Math.abs(delta) <= step) {
        animation.currentPositionPercent = animation.targetPositionPercent;
      } else {
        animation.currentPositionPercent += Math.sign(delta) * step;
      }
      this.applyHaCoverAnimation(animation);
    }
    this.updateSelectionBox();
    this.updateHaPanelMarkers();
  }

  private sanitizeModelGeometry(root: THREE.Object3D) {
    const meshes: THREE.Mesh[] = [];
    root.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        meshes.push(node as THREE.Mesh);
      }
    });
    for (const mesh of meshes) {
      const isRenderable = this.sanitizeMeshGeometry(mesh, { cloneGeometry: true });
      if (!isRenderable) {
        mesh.parent?.remove(mesh);
      }
    }
  }

  private sanitizeMeshGeometry(
    mesh: THREE.Mesh,
    options: { cloneGeometry: boolean },
  ) {
    let geometry = mesh.geometry;
    if (!geometry || !geometry.attributes) {
      return false;
    }
    if (options.cloneGeometry) {
      geometry = geometry.clone();
      mesh.geometry = geometry;
    }
    for (const [name, attribute] of Object.entries(geometry.attributes)) {
      if (!(attribute instanceof THREE.BufferAttribute)) {
        continue;
      }
      if (attribute.array instanceof Float32Array) {
        this.sanitizeFloatAttribute(geometry, name, attribute);
      }
    }
    const merged = mergeVertices(geometry, 1e-6);
    if (merged !== geometry) {
      mesh.geometry = merged;
      geometry = merged;
    }
    const hasTriangles = this.removeDegenerateTriangles(geometry);
    if (!hasTriangles) {
      return false;
    }
    this.sanitizeGeometryGroups(geometry);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return true;
  }

  private sanitizeFloatAttribute(
    geometry: THREE.BufferGeometry,
    name: string,
    attribute: THREE.BufferAttribute,
  ) {
    const source = attribute.array as Float32Array;
    let needsCleanup = false;
    for (let index = 0; index < source.length; index += 1) {
      const value = source[index];
      if (!Number.isFinite(value) || Math.abs(value) > 1e20) {
        needsCleanup = true;
        break;
      }
    }
    if (!needsCleanup) {
      return;
    }
    const array = new Float32Array(source);
    for (let index = 0; index < array.length; index += 1) {
      const value = array[index];
      if (!Number.isFinite(value) || Math.abs(value) > 1e20) {
        array[index] = 0;
      }
    }
    const cleaned = new THREE.BufferAttribute(
      array,
      attribute.itemSize,
      attribute.normalized,
    );
    cleaned.name = attribute.name;
    cleaned.usage = attribute.usage;
    geometry.setAttribute(name, cleaned);
  }

  private removeDegenerateTriangles(geometry: THREE.BufferGeometry) {
    const position = geometry.getAttribute("position");
    if (!(position instanceof THREE.BufferAttribute) || position.itemSize < 3) {
      return false;
    }
    const index = geometry.getIndex();
    const indexArray = index
      ? Array.from(index.array as ArrayLike<number>)
      : Array.from({ length: position.count }, (_, value) => value);
    if (indexArray.length < 3) {
      return false;
    }
    const nextIndices: number[] = [];
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const ab = new THREE.Vector3();
    const ac = new THREE.Vector3();
    const cross = new THREE.Vector3();
    for (let offset = 0; offset + 2 < indexArray.length; offset += 3) {
      const ia = indexArray[offset];
      const ib = indexArray[offset + 1];
      const ic = indexArray[offset + 2];
      if (
        ia < 0 ||
        ib < 0 ||
        ic < 0 ||
        ia >= position.count ||
        ib >= position.count ||
        ic >= position.count
      ) {
        continue;
      }
      a.fromBufferAttribute(position, ia);
      b.fromBufferAttribute(position, ib);
      c.fromBufferAttribute(position, ic);
      ab.subVectors(b, a);
      ac.subVectors(c, a);
      cross.crossVectors(ab, ac);
      if (cross.lengthSq() <= 1e-16) {
        continue;
      }
      nextIndices.push(ia, ib, ic);
    }
    if (nextIndices.length === indexArray.length) {
      return true;
    }
    if (nextIndices.length < 3) {
      geometry.setIndex([]);
      return false;
    }
    geometry.setIndex(nextIndices);
    return true;
  }

  private sanitizeGeometryGroups(geometry: THREE.BufferGeometry) {
    if (geometry.groups.length === 0) {
      return;
    }
    const drawCount = geometry.getIndex()?.count ?? geometry.getAttribute("position")?.count ?? 0;
    let changed = false;
    const groups = geometry.groups
      .map((group) => {
        const rawCount = Math.min(group.count, Math.max(0, drawCount - group.start));
        const count = rawCount - (rawCount % 3);
        changed ||= count !== group.count;
        return {
          ...group,
          count,
        };
      })
      .filter((group) => group.start >= 0 && group.count >= 3);
    if (!changed && groups.length === geometry.groups.length) {
      return;
    }
    geometry.clearGroups();
    for (const group of groups) {
      geometry.addGroup(group.start, group.count, group.materialIndex);
    }
  }

  private ensureLightReactiveMaterial(
    material: THREE.Material | THREE.Material[],
  ): THREE.Material | THREE.Material[] {
    if (Array.isArray(material)) {
      return material.map((entry) => this.ensureLightReactiveMaterial(entry) as THREE.Material);
    }
    if (material instanceof THREE.MeshBasicMaterial) {
      const next = new THREE.MeshStandardMaterial({
        name: material.name,
        color: material.color,
        map: material.map,
        alphaMap: material.alphaMap,
        aoMap: material.aoMap,
        opacity: material.opacity,
        transparent: material.transparent,
        side: material.side,
        depthWrite: material.depthWrite,
        depthTest: material.depthTest,
        roughness: 0.72,
        metalness: 0.02,
      });
      material.dispose();
      return next;
    }
    return material;
  }

  private enhanceRealisticMaterialSet(
    mesh: THREE.Mesh,
    material: THREE.Material | THREE.Material[],
  ): THREE.Material | THREE.Material[] {
    this.realisticOriginalMaterials ??= new Map();
    if (!this.realisticOriginalMaterials.has(mesh.uuid)) {
      this.realisticOriginalMaterials.set(mesh.uuid, material);
    }
    if (Array.isArray(material)) {
      return material.map((entry) => this.enhanceRealisticMaterial(mesh, entry));
    }
    return this.enhanceRealisticMaterial(mesh, material);
  }

  private enhanceRealisticMaterial(mesh: THREE.Mesh, material: THREE.Material) {
    if (material.userData.realisticEnhanced) {
      return material;
    }
    const role = resolveRealisticMaterialRole(mesh.name, material.name);
    if (!role) {
      material.userData.realisticEnhanced = true;
      return material;
    }
    const enhanced = enhanceMaterialForRole(material, role);
    enhanced.userData = { ...material.userData, realisticEnhanced: true, realisticRole: role };
    return enhanced;
  }

  private restoreRealisticMaterials() {
    this.realisticOriginalMaterials ??= new Map();
    if (!this.modelRoot || this.realisticOriginalMaterials.size === 0) {
      return;
    }
    this.modelRoot.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }
      const original = this.realisticOriginalMaterials.get(mesh.uuid);
      if (!original) {
        return;
      }
      const currentMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of currentMaterials) {
        if (material !== original && !(Array.isArray(original) && original.includes(material))) {
          material.dispose();
        }
      }
      mesh.material = original;
      this.realisticOriginalMaterials.delete(mesh.uuid);
    });
  }

  private updateDirectionalShadowBounds(root: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(root);
    if (box.isEmpty()) {
      return;
    }
    const bounds = computeDirectionalShadowBounds(box);
    this.directional.shadow.camera.left = bounds.left;
    this.directional.shadow.camera.right = bounds.right;
    this.directional.shadow.camera.top = bounds.top;
    this.directional.shadow.camera.bottom = bounds.bottom;
    this.directional.shadow.camera.near = bounds.near;
    this.directional.shadow.camera.far = bounds.far;
    this.directional.shadow.camera.updateProjectionMatrix();
    this.directional.shadow.needsUpdate = true;
  }

  private rebuildObjectMap() {
    this.objectMap.clear();
    this.selectableMeshes = [];
    this.modelRoot?.traverse((node) => {
      this.objectMap.set(node.uuid, node);
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) {
        this.selectableMeshes.push(mesh);
      }
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

  private focusPreviewCameraOnObject(object: THREE.Object3D) {
    if (!this.camera || !this.controls || this.viewMode !== "perspective") {
      return;
    }
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) {
      return;
    }
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z, 0.6);
    const currentDirection = this.camera.position
      .clone()
      .sub(this.controls.target)
      .normalize();
    if (currentDirection.lengthSq() === 0) {
      currentDirection.set(0.9, 0.55, 1).normalize();
    }
    const distance = Math.max(
      maxSize / (2 * Math.tan((this.camera.fov * Math.PI) / 360)) * 1.7,
      2.5,
    );
    const minHeight = Math.max(size.y * 0.22, 0.35);
    const toPosition = center
      .clone()
      .add(currentDirection.multiplyScalar(distance));
    toPosition.y = Math.max(toPosition.y, center.y + minHeight);
    this.previewCameraTransition = {
      camera: this.camera,
      startTime: performance.now(),
      duration: 850,
      fromPosition: this.camera.position.clone(),
      toPosition,
      fromTarget: this.controls.target.clone(),
      toTarget: center,
    };
  }

  private getRegionVisualY() {
    if (!this.modelRoot) {
      return 0.035;
    }
    const box = new THREE.Box3().setFromObject(this.modelRoot);
    if (box.isEmpty()) {
      return 0.035;
    }
    return box.max.y + 0.035;
  }

  private clearRegionObjects() {
    for (const child of [...this.regionGroup.children]) {
      this.regionGroup.remove(child);
      disposeObjectTree(child);
    }
  }

  private clearRegionDraftObjects() {
    for (const child of [...this.regionDraftGroup.children]) {
      this.regionDraftGroup.remove(child);
      disposeObjectTree(child);
    }
  }

  private createRegionFill(
    region: EditorRegion,
    y: number,
    selected: boolean,
    layer: "top" | "bottom" | "surface" = "surface",
  ) {
    const shape = new THREE.Shape(
      region.points.map((point) => new THREE.Vector2(point.x, point.z)),
    );
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0x29d3c4,
      transparent: true,
      opacity: selected ? 0.16 : 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = y;
    mesh.renderOrder = selected ? 22 : 20;
    mesh.userData.selectable = false;
    mesh.userData.regionFaceLayer = layer;
    return mesh;
  }

  private createRegionLine(
    points: RegionPoint[],
    y: number,
    options: {
      closed: boolean;
      color?: number;
      opacity?: number;
      radius?: number;
    },
  ) {
    const curve = new THREE.CurvePath<THREE.Vector3>();
    for (let index = 0; index < points.length - 1; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      curve.add(
        new THREE.LineCurve3(
          new THREE.Vector3(current.x, y, current.z),
          new THREE.Vector3(next.x, y, next.z),
        ),
      );
    }
    if (options.closed && points.length > 2) {
      const last = points[points.length - 1];
      const first = points[0];
      curve.add(
        new THREE.LineCurve3(
          new THREE.Vector3(last.x, y, last.z),
          new THREE.Vector3(first.x, y, first.z),
        ),
      );
    }
    const material = new THREE.MeshBasicMaterial({
      color: options.color ?? 0x29d3c4,
      transparent: true,
      opacity: options.opacity ?? 0.72,
      depthWrite: false,
    });
    if (curve.curves.length === 0) {
      const marker = new THREE.Mesh(new THREE.SphereGeometry(options.radius ?? 0.045, 10, 8), material);
      marker.position.set(points[0]?.x ?? 0, y, points[0]?.z ?? 0);
      marker.renderOrder = 24;
      marker.userData.selectable = false;
      return marker;
    }
    const geometry = new THREE.TubeGeometry(
      curve,
      Math.max(points.length * 10, 24),
      options.radius ?? 0.026,
      8,
      options.closed,
    );
    const line = new THREE.Mesh(geometry, material);
    line.renderOrder = 24;
    line.userData.selectable = false;
    return line;
  }

  private getRegionVerticalSpan() {
    if (!this.modelRoot) {
      return { bottom: 0, top: 1 };
    }
    const box = new THREE.Box3().setFromObject(this.modelRoot);
    if (box.isEmpty()) {
      return { bottom: 0, top: 1 };
    }
    return { bottom: box.min.y, top: box.max.y + 0.035 };
  }

  private createSelectedRegionVolume(region: EditorRegion) {
    const { bottom, top } = this.getRegionVerticalSpan();
    const vertices: number[] = [];
    const indices: number[] = [];
    for (const point of region.points) {
      vertices.push(point.x, bottom, point.z, point.x, top, point.z);
    }
    for (let index = 0; index < region.points.length; index += 1) {
      const nextIndex = (index + 1) % region.points.length;
      const bottomA = index * 2;
      const topA = bottomA + 1;
      const bottomB = nextIndex * 2;
      const topB = bottomB + 1;
      indices.push(bottomA, bottomB, topB, bottomA, topB, topA);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const material = new THREE.MeshBasicMaterial({
      color: 0x29d3c4,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const volume = new THREE.Mesh(geometry, material);
    volume.renderOrder = 23;
    volume.userData.selectable = false;
    volume.userData.regionVolume = true;
    return volume;
  }

  private createRegionVerticalEdges(region: EditorRegion, bottom: number, top: number) {
    const curve = new THREE.CurvePath<THREE.Vector3>();
    for (const point of region.points) {
      curve.add(
        new THREE.LineCurve3(
          new THREE.Vector3(point.x, bottom, point.z),
          new THREE.Vector3(point.x, top, point.z),
        ),
      );
    }
    const geometry = new THREE.TubeGeometry(
      curve,
      Math.max(region.points.length * 6, 24),
      0.009,
      6,
      false,
    );
    const material = new THREE.MeshBasicMaterial({
      color: 0x29d3c4,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const edges = new THREE.Mesh(geometry, material);
    edges.renderOrder = 25;
    edges.userData.selectable = false;
    edges.userData.regionEdgeLayer = "vertical";
    return edges;
  }

  private createRegionGlow(region: EditorRegion, y: number) {
    const bounds = getEditorRegionBounds(region);
    const curve = new THREE.CurvePath<THREE.Vector3>();
    for (let index = 0; index < region.points.length; index += 1) {
      const current = region.points[index];
      const next = region.points[(index + 1) % region.points.length];
      curve.add(
        new THREE.LineCurve3(
          new THREE.Vector3(current.x, y, current.z),
          new THREE.Vector3(next.x, y, next.z),
        ),
      );
    }
    const maxSize = bounds ? Math.max(bounds.size.x, bounds.size.z) : 1;
    const radius = THREE.MathUtils.clamp(maxSize * 0.0025, 0.008, 0.018);
    const geometry = new THREE.TubeGeometry(
      curve,
      Math.max(region.points.length * 8, 32),
      radius,
      8,
      true,
    );
    const material = new THREE.MeshBasicMaterial({
      color: 0x29d3c4,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Mesh(geometry, material);
    glow.renderOrder = 26;
    glow.userData.selectable = false;
    return glow;
  }

  private rebuildRegionObjects() {
    this.clearRegionObjects();
    if (!this.selectedRegionId) {
      return;
    }
    const y = this.getRegionVisualY();
    for (const region of this.regions) {
      const selected = region.id === this.selectedRegionId;
      if (!selected) {
        continue;
      }
      const group = new THREE.Group();
      group.name = `region:${region.name}`;
      group.userData.regionId = region.id;
      group.userData.selectable = false;
      const { bottom, top } = this.getRegionVerticalSpan();
      const highlightMode = region.highlightMode ?? "edges";
      if (highlightMode === "none") {
        continue;
      }
      if (highlightMode === "bottom") {
        group.add(this.createRegionFill(region, bottom + 0.006, selected, "bottom"));
        this.regionGroup.add(group);
        continue;
      }
      if (highlightMode === "top") {
        group.add(this.createRegionFill(region, top + 0.006, selected, "top"));
        this.regionGroup.add(group);
        continue;
      }

      group.add(this.createSelectedRegionVolume(region));
      group.add(this.createRegionFill(region, bottom + 0.006, selected, "bottom"));
      group.add(this.createRegionFill(region, top + 0.006, selected, "top"));

      if (highlightMode === "edges") {
        const topEdges = this.createRegionLine(region.points, top + 0.006, {
          closed: true,
          opacity: 0.74,
          radius: 0.012,
        });
        topEdges.userData.regionEdgeLayer = "top";
        group.add(topEdges);
        const bottomEdges = this.createRegionLine(region.points, bottom + 0.006, {
          closed: true,
          opacity: 0.46,
          radius: 0.01,
        });
        bottomEdges.userData.regionEdgeLayer = "bottom";
        group.add(bottomEdges);
        group.add(this.createRegionVerticalEdges(region, bottom + 0.006, top + 0.006));
        group.add(this.createRegionGlow(region, y + 0.012));
      }
      this.regionGroup.add(group);
    }
  }

  private updateRegionDraftObjects() {
    this.clearRegionDraftObjects();
    const y = this.getRegionVisualY() + 0.025;
    if (this.regionDraftPoints.length === 0) {
      return;
    }
    this.regionDraftGroup.add(
      this.createRegionLine(
        this.regionDraftHoverPoint
          ? [...this.regionDraftPoints, this.regionDraftHoverPoint]
          : this.regionDraftPoints,
        y,
        {
          closed: !this.regionDraftHoverPoint && this.regionDraftPoints.length >= 3,
          opacity: 0.86,
          radius: 0.038,
        },
      ),
    );
    for (const point of this.regionDraftPoints) {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 12, 8),
        new THREE.MeshBasicMaterial({
          color: 0x29d3c4,
          transparent: true,
          opacity: 0.92,
          depthWrite: false,
        }),
      );
      marker.position.set(point.x, y + 0.015, point.z);
      marker.renderOrder = 28;
      marker.userData.selectable = false;
      this.regionDraftGroup.add(marker);
    }
  }

  private resolveRegionPointAt(clientX: number, clientY: number) {
    const activeCamera =
      this.viewMode === "perspective" ? this.camera : this.orthoCamera;
    if (!this.renderer || !activeCamera) {
      return null;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, activeCamera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.getRegionVisualY());
    const point = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(plane, point)) {
      return null;
    }
    return { x: point.x, z: point.z };
  }

  private focusCameraOnRegion(region: EditorRegion) {
    if (!this.controls) {
      return;
    }
    const bounds = getEditorRegionBounds(region);
    if (!bounds) {
      return;
    }
    const visualY = this.getRegionVisualY();
    const center = new THREE.Vector3(bounds.center.x, visualY, bounds.center.z);
    if (this.viewMode !== "perspective") {
      if (!this.orthoCamera) {
        return;
      }
      const delta = center.clone().sub(this.controls.target);
      this.previewCameraTransition = {
        camera: this.orthoCamera,
        startTime: performance.now(),
        duration: 520,
        fromPosition: this.orthoCamera.position.clone(),
        toPosition: this.orthoCamera.position.clone().add(delta),
        fromTarget: this.controls.target.clone(),
        toTarget: center,
      };
      return;
    }
    if (!this.camera) {
      return;
    }
    const maxSize = Math.max(bounds.size.x, bounds.size.z, 0.8);
    let direction = this.camera.position.clone().sub(this.controls.target);
    if (direction.lengthSq() === 0) {
      direction = new THREE.Vector3(0.9, 0.65, 1);
    }
    direction.normalize();
    const distance = Math.max(
      (maxSize / (2 * Math.tan((this.camera.fov * Math.PI) / 360))) * 1.85,
      2.6,
    );
    const nextPosition = center.clone().add(direction.multiplyScalar(distance));
    nextPosition.y = Math.max(nextPosition.y, visualY + maxSize * 0.45, visualY + 0.8);
    this.camera.near = Math.max(distance / 100, 0.01);
    this.camera.far = Math.max(distance * 100, 1000);
    this.camera.updateProjectionMatrix();
    this.previewCameraTransition = {
      camera: this.camera,
      startTime: performance.now(),
      duration: 650,
      fromPosition: this.camera.position.clone(),
      toPosition: nextPosition,
      fromTarget: this.controls.target.clone(),
      toTarget: center,
    };
  }

  private restoreOrbitTargetToGridCenter() {
    if (!this.controls) {
      return;
    }
    const target = new THREE.Vector3(0, 0, 0);
    if (this.controls.target.distanceToSquared(target) < 0.000001) {
      return;
    }
    const activeCamera = this.viewMode === "perspective" ? this.camera : this.orthoCamera;
    if (!activeCamera) {
      this.controls.target.copy(target);
      this.controls.update();
      return;
    }
    const delta = target.clone().sub(this.controls.target);
    this.previewCameraTransition = {
      camera: activeCamera,
      startTime: performance.now(),
      duration: 480,
      fromPosition: activeCamera.position.clone(),
      toPosition: activeCamera.position.clone().add(delta),
      fromTarget: this.controls.target.clone(),
      toTarget: target,
    };
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
    if (this.isFirstPersonActive()) {
      if (event.button !== 0) {
        return;
      }
      this.firstPersonPointerState = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
      this.renderer.domElement.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }
    if (this.previewMode && this.viewMode !== "perspective") {
      return;
    }
    if (this.previewMode && event.button !== 0) {
      return;
    }
    if (this.regionDrawingEnabled && !this.previewMode && event.button === 0) {
      this.pointerDownState = {
        x: event.clientX,
        y: event.clientY,
        button: event.button,
        shiftKey: event.shiftKey,
      };
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
    this.pointerDownState = {
      x: event.clientX,
      y: event.clientY,
      button: event.button,
      shiftKey: event.shiftKey,
    };
    this.contextMenuPointerDownState = {
      x: event.clientX,
      y: event.clientY,
      button: event.button,
    };
  };

  private pickSelectableAt(clientX: number, clientY: number) {
    if (!this.renderer || !this.camera || !this.modelRoot) {
      return null;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = this.selectableMeshes.filter(
      (node) => node.visible,
    );
    const [hit] = this.raycaster.intersectObjects(meshes, false);
    return hit ? this.resolveSelectable(hit.object) : null;
  }

  private handleContextMenu(event: MouseEvent) {
    event.preventDefault();
    const pointerDownState = this.contextMenuPointerDownState;
    this.contextMenuPointerDownState = null;
    if (pointerDownState?.button === 2) {
      const moved = Math.hypot(
        event.clientX - pointerDownState.x,
        event.clientY - pointerDownState.y,
      );
      if (moved > 4) {
        return;
      }
    }
    if (this.regionDrawingEnabled && !this.previewMode) {
      this.cancelRegionDrawing();
      return;
    }
    if (this.viewMode === "perspective") {
      const target = this.pickSelectableAt(event.clientX, event.clientY);
      if (!target || target === this.modelRoot) {
        return;
      }
      this.selectObject(target.uuid);
      this.options.onObjectContextMenu?.({
        clientX: event.clientX,
        clientY: event.clientY,
        uuid: target.uuid,
      });
      return;
    }
  }

  private handlePointerMove = (event: PointerEvent) => {
    if (this.isFirstPersonActive()) {
      const pointerState = this.firstPersonPointerState;
      if (!pointerState || pointerState.pointerId !== event.pointerId) {
        return;
      }
      const deltaX = event.clientX - pointerState.x;
      const deltaY = event.clientY - pointerState.y;
      pointerState.x = event.clientX;
      pointerState.y = event.clientY;
      this.firstPersonYaw -= deltaX * this.firstPersonLookSensitivity;
      this.firstPersonPitch = THREE.MathUtils.clamp(
        this.firstPersonPitch - deltaY * this.firstPersonLookSensitivity,
        -Math.PI / 2 + 0.08,
        Math.PI / 2 - 0.08,
      );
      this.applyFirstPersonCameraRotation();
      this.updateFirstPersonControlTarget();
      event.preventDefault();
      return;
    }
    if (this.regionDrawingEnabled && !this.previewMode) {
      this.regionDraftHoverPoint = this.resolveRegionPointAt(event.clientX, event.clientY);
      this.updateRegionDraftObjects();
      return;
    }
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
    if (this.isFirstPersonActive()) {
      if (this.firstPersonPointerState?.pointerId === event.pointerId) {
        this.firstPersonPointerState = null;
        if (this.renderer?.domElement.hasPointerCapture(event.pointerId)) {
          this.renderer.domElement.releasePointerCapture(event.pointerId);
        }
      }
      return;
    }
    if (this.regionDrawingEnabled && !this.previewMode) {
      const pointerDownState = this.pointerDownState;
      this.pointerDownState = null;
      if (!pointerDownState || pointerDownState.button !== 0) {
        return;
      }
      const moved = Math.hypot(
        event.clientX - pointerDownState.x,
        event.clientY - pointerDownState.y,
      );
      if (moved > 4) {
        return;
      }
      const point = this.resolveRegionPointAt(event.clientX, event.clientY);
      if (!point) {
        return;
      }
      this.regionDraftPoints = [...this.regionDraftPoints, point];
      this.regionDraftHoverPoint = null;
      this.updateRegionDraftObjects();
      this.options.onRegionDraftChange?.(this.regionDraftPoints.length);
      return;
    }
    if (this.viewMode === "perspective") {
      const pointerDownState = this.pointerDownState;
      this.pointerDownState = null;
      if (!pointerDownState || pointerDownState.button !== 0) {
        return;
      }
      const moved = Math.hypot(
        event.clientX - pointerDownState.x,
        event.clientY - pointerDownState.y,
      );
      if (moved > 4) {
        return;
      }
      const target = this.pickSelectableAt(event.clientX, event.clientY);
      const targetBindings =
        target && target !== this.modelRoot ? getObjectBindings(target) : [];
      const directObjectHasBindings = getBoundEntityIds(targetBindings).length > 0;
      if (target && directObjectHasBindings) {
        if (pointerDownState.shiftKey && !this.previewMode) {
          this.toggleObjectSelection(target.uuid);
          return;
        }
        this.selectObject(target.uuid);
        if (this.previewMode && this.previewCameraMode === "auto") {
          this.focusPreviewCameraOnObject(target);
        }
        return;
      }
      if (!target) {
        if (!pointerDownState.shiftKey) {
          this.selectObject(null);
        }
        return;
      }
      this.selectObject(target.uuid);
      if (this.previewMode && this.previewCameraMode === "auto") {
        this.focusPreviewCameraOnObject(target);
      }
      return;
    }
    if (!this.renderer || !this.dragStart) {
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
      if (!event.shiftKey) {
        this.selectObject(null);
      }
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
    const now = performance.now();
    const fps = this.fpsMeter.sample(now);
    if (fps !== null) {
      this.options.onFpsChange?.(fps, {
        calls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
        points: this.renderer.info.render.points,
        lines: this.renderer.info.render.lines,
      });
    }
    this.resizeIfNeeded();
    this.updatePreviewCameraTransition(now);
    this.updateFirstPersonControls(now);
    if (!this.isFirstPersonActive()) {
      this.controls?.update();
    }
    this.updateHaCoverAnimations();
    this.updateWeatherEffects();
    this.updateHaPanelMarkers();
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

  private isFirstPersonActive() {
    return (
      this.previewMode &&
      this.previewCameraMode === "firstPerson" &&
      this.viewMode === "perspective"
    );
  }

  private enterFirstPersonMode() {
    if (!this.camera || !this.controls || !this.modelRoot) {
      return;
    }
    this.viewMode = "perspective";
    this.previewCameraTransition = null;
    this.controls.object = this.camera;
    this.controls.enabled = false;
    this.resetFirstPersonMovement();
    const bounds = new THREE.Box3().setFromObject(this.modelRoot);
    if (!bounds.isEmpty()) {
      const spawn = getFirstPersonSpawnPosition({
        min: bounds.min,
        max: bounds.max,
      });
      this.camera.position.set(spawn.x, spawn.y, spawn.z);
    }
    this.firstPersonYaw = 0;
    this.firstPersonPitch = 0;
    this.firstPersonLastFrame = performance.now();
    this.applyFirstPersonCameraRotation();
    this.updateFirstPersonControlTarget();
  }

  private exitFirstPersonMode() {
    if (
      this.firstPersonPointerState &&
      this.renderer?.domElement.hasPointerCapture(this.firstPersonPointerState.pointerId)
    ) {
      this.renderer.domElement.releasePointerCapture(
        this.firstPersonPointerState.pointerId,
      );
    }
    this.firstPersonPointerState = null;
    this.resetFirstPersonMovement();
    if (this.controls) {
      this.applyControlMode(this.viewMode);
      this.updateFirstPersonControlTarget();
    }
  }

  private resetFirstPersonMovement() {
    this.firstPersonMoveState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      fast: false,
    };
  }

  private applyFirstPersonCameraRotation() {
    if (!this.camera) {
      return;
    }
    this.camera.rotation.set(
      this.firstPersonPitch,
      this.firstPersonYaw,
      0,
      "YXZ",
    );
  }

  private updateFirstPersonControlTarget() {
    if (!this.camera || !this.controls) {
      return;
    }
    const direction = this.camera.getWorldDirection(new THREE.Vector3());
    this.controls.target.copy(this.camera.position).add(direction);
  }

  private getFirstPersonMovementBounds() {
    if (!this.modelRoot) {
      return null;
    }
    const box = new THREE.Box3().setFromObject(this.modelRoot);
    if (box.isEmpty()) {
      return null;
    }
    const size = box.getSize(new THREE.Vector3());
    const padding = Math.max(Math.max(size.x, size.z) * 0.08, 0.8);
    box.expandByVector(new THREE.Vector3(padding, padding * 0.5, padding));
    return box;
  }

  private updateFirstPersonControls(now: number) {
    if (!this.isFirstPersonActive() || !this.camera) {
      this.firstPersonLastFrame = now;
      return;
    }
    const deltaSeconds = Math.min(
      Math.max((now - this.firstPersonLastFrame) / 1000, 0),
      0.05,
    );
    this.firstPersonLastFrame = now;
    const speed =
      this.firstPersonMoveSpeed *
      (this.firstPersonMoveState.fast ? this.firstPersonFastMultiplier : 1);
    const velocity = getFirstPersonVelocity(
      this.firstPersonMoveState,
      this.firstPersonYaw,
      speed * deltaSeconds,
    );
    if (velocity.x === 0 && velocity.z === 0) {
      return;
    }
    const nextPosition = this.camera.position.clone().add(
      new THREE.Vector3(velocity.x, velocity.y, velocity.z),
    );
    const bounds = this.getFirstPersonMovementBounds();
    if (bounds) {
      const clamped = clampToFirstPersonBounds(nextPosition, {
        min: bounds.min,
        max: bounds.max,
      });
      this.camera.position.set(clamped.x, clamped.y, clamped.z);
    } else {
      this.camera.position.copy(nextPosition);
    }
    this.updateFirstPersonControlTarget();
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

  private translateObjectsByWorldDelta(
    objects: THREE.Object3D[],
    delta: THREE.Vector3,
  ) {
    for (const object of objects) {
      if (!object.parent) {
        continue;
      }
      const worldPosition = object.getWorldPosition(new THREE.Vector3()).add(delta);
      object.position.copy(object.parent.worldToLocal(worldPosition));
      object.updateMatrixWorld(true);
    }
  }

  private rotateObjectsAroundWorldCenter(
    objects: THREE.Object3D[],
    center: THREE.Vector3,
    rotationDelta: THREE.Quaternion,
    startPositions?: Map<string, THREE.Vector3>,
    startWorldQuaternions?: Map<string, THREE.Quaternion>,
  ) {
    for (const object of objects) {
      if (!object.parent) {
        continue;
      }
      const startPosition =
        startPositions?.get(object.uuid) ??
        object.getWorldPosition(new THREE.Vector3());
      const startQuaternion =
        startWorldQuaternions?.get(object.uuid) ??
        object.getWorldQuaternion(new THREE.Quaternion());
      const nextWorldPosition = startPosition
        .clone()
        .sub(center)
        .applyQuaternion(rotationDelta)
        .add(center);
      object.position.copy(object.parent.worldToLocal(nextWorldPosition));
      const parentWorldQuaternion = object.parent.getWorldQuaternion(
        new THREE.Quaternion(),
      );
      object.quaternion.copy(
        parentWorldQuaternion
          .invert()
          .multiply(rotationDelta.clone().multiply(startQuaternion)),
      );
      object.updateMatrixWorld(true);
    }
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
    this.transformPivot.rotation.set(0, 0, 0);
    this.transformPivot.updateMatrixWorld(true);
    this.transformControls.setMode(this.transformMode);
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

  private applyWeatherAtmosphere() {
    const preset = getWeatherPreset(this.weatherConfig.mode);
    const environmentColor = colorTemperatureToColor(
      this.environmentConfig.colorTemperatureKelvin,
    );
    this.ambient.color.copy(environmentColor);
    this.directional.color.copy(environmentColor);
    this.ambient.intensity =
      this.environmentConfig.ambientIntensity * preset.lighting.ambientMultiplier;
    this.directional.intensity =
      this.environmentConfig.directionalIntensity *
      preset.lighting.directionalMultiplier;
    const background = resolveWeatherBackground(
      this.weatherConfig.mode,
      this.appearanceTheme,
    );
    this.scene.background = new THREE.Color(background);
    const fogDensity = resolveWeatherFogDensity(
      preset.lighting.fogDensity,
      this.getWeatherSceneSpan(),
    );
    this.scene.fog =
      fogDensity > 0
        ? new THREE.FogExp2(background, fogDensity)
        : null;
    if (this.renderer) {
      this.renderer.setClearColor(background, 1);
      this.renderer.toneMappingExposure = resolveToneMappingExposure({
        exposure: this.environmentConfig.exposure,
        weatherExposureOffset: preset.lighting.exposureOffset,
        realisticRenderingEnabled: this.performanceConfig.realisticRenderingEnabled,
      });
    }
  }

  private rebuildWeatherEffects() {
    this.clearWeatherEffects();
    const preset = getWeatherPreset(this.weatherConfig.mode);
    if (preset.mode === "none") {
      return;
    }
    const sceneSpan = this.getWeatherSceneSpan();
    const weatherScale = resolveWeatherScale(sceneSpan);
    this.addWeatherClouds(preset, sceneSpan, weatherScale);
    if (preset.mode === "sunny") {
      this.addSunnyGlow();
    }
    if (preset.rain.count > 0) {
      const bounds = this.getWeatherBounds();
      this.weatherRain = createRainLineEffect({
        bounds: {
          minX: bounds.minX,
          maxX: bounds.maxX,
          minY: bounds.minY,
          maxY: resolveWeatherRainTop(bounds.modelTop, bounds.skyPadding),
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
        },
        count: resolveWeatherRainParticleCount(
          preset.mode,
          preset.rain.count,
          sceneSpan,
        ),
        speed: resolveWeatherRainSpeed(preset.rain.speed, sceneSpan),
        drift: preset.rain.windDrift * weatherScale,
        opacity: preset.rain.opacity,
        color: 0xf4f1ea,
        length: resolveWeatherRainDropLength(
          preset.mode === "rain-light" ? 0.42 : 0.7,
          sceneSpan,
        ),
      });
      this.weatherGroup.add(this.weatherRain.object);
    }
    if (preset.wind.count > 0) {
      const bounds = this.getWeatherBounds();
      this.weatherWind = createWindLineEffect({
        bounds: {
          minX: bounds.minX,
          maxX: bounds.maxX,
          minY: bounds.minY,
          maxY: bounds.maxY,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
        },
        count: resolveWeatherParticleCount(preset.wind.count, sceneSpan, 4),
        speed: preset.wind.speed * weatherScale,
        opacity: preset.wind.opacity,
        color: 0xd7f3ff,
        length: 5.8 * weatherScale,
      });
      this.weatherGroup.add(this.weatherWind.object);
    }
    if (preset.lightning.enabled) {
      this.addLightningEffect();
      this.triggerLightningBurst(preset);
    }
  }

  private clearWeatherEffects() {
    for (const child of [...this.weatherGroup.children]) {
      this.weatherGroup.remove(child);
      disposeObjectTree(child);
    }
    this.weatherRain = null;
    this.weatherWind = null;
    this.weatherClouds = [];
    this.weatherLightningLight = null;
    this.weatherLightningBolt = null;
    this.weatherLightningSkyFlash = null;
    this.weatherLightningFlash = 0;
    this.weatherLightningBurstFrames = 0;
    this.weatherLightningCooldownFrames = 0;
  }

  private getWeatherSceneSpan() {
    if (!this.modelRoot) {
      return 20;
    }
    const box = new THREE.Box3().setFromObject(this.modelRoot);
    if (box.isEmpty()) {
      return 20;
    }
    const size = box.getSize(new THREE.Vector3());
    return Math.max(size.x, size.y, size.z, 1);
  }

  private getWeatherBounds() {
    const box = this.modelRoot
      ? new THREE.Box3().setFromObject(this.modelRoot)
      : new THREE.Box3(
          new THREE.Vector3(-6, 0, -6),
          new THREE.Vector3(6, 4, 6),
        );
    if (box.isEmpty()) {
      box.set(
        new THREE.Vector3(-6, 0, -6),
        new THREE.Vector3(6, 4, 6),
      );
    }
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const sceneSpan = Math.max(size.x, size.z, 1);
    const span = resolveWeatherEffectSpan(sceneSpan);
    const skyPadding = resolveWeatherSkyPadding(sceneSpan, size.y);
    const xPadding = Math.max((span - size.x) / 2, 6);
    const zPadding = Math.max((span - size.z) / 2, 6);
    return {
      center,
      minX: box.min.x - xPadding,
      maxX: box.max.x + xPadding,
      minY: box.min.y,
      maxY: box.max.y + skyPadding,
      modelTop: box.max.y,
      skyPadding,
      minZ: box.min.z - zPadding,
      maxZ: box.max.z + zPadding,
    };
  }

  private updatePreviewCameraTransition(now: number) {
    const transition = this.previewCameraTransition;
    if (!transition || !this.controls) {
      return;
    }
    const ratio = THREE.MathUtils.clamp(
      (now - transition.startTime) / transition.duration,
      0,
      1,
    );
    const eased = ratio < 0.5
      ? 4 * ratio * ratio * ratio
      : 1 - Math.pow(-2 * ratio + 2, 3) / 2;
    transition.camera.position.lerpVectors(
      transition.fromPosition,
      transition.toPosition,
      eased,
    );
    this.controls.target.lerpVectors(
      transition.fromTarget,
      transition.toTarget,
      eased,
    );
    if (ratio >= 1) {
      if ((transition.camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
        (transition.camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      }
      this.previewCameraTransition = null;
    }
    this.controls.update();
  }

  private addWeatherClouds(
    preset: WeatherPreset,
    sceneSpan: number,
    weatherScale: number,
  ) {
    if (preset.cloud.count === 0) {
      return;
    }
    const texture = this.createCloudTexture();
    const bounds = this.getWeatherBounds();
    const wrapPadding = resolveWeatherCloudWrapPadding(sceneSpan);
    const count = resolveWeatherCloudParticleCount(
      preset.mode,
      preset.cloud.count,
      sceneSpan,
      2.5,
    );
    for (let index = 0; index < count; index += 1) {
      const material = new THREE.SpriteMaterial({
        map: texture,
        color: preset.mode === "sunny" ? 0xffffff : 0xb8c4cf,
        transparent: true,
        opacity: preset.cloud.opacity * THREE.MathUtils.lerp(0.72, 1.12, Math.random()),
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(material);
      const scale = resolveWeatherCloudScale(
        THREE.MathUtils.lerp(3.8, 8.5, Math.random()) * weatherScale,
        preset.mode,
      );
      sprite.scale.set(scale * 1.8, scale * 0.58, 1);
      sprite.position.set(
        THREE.MathUtils.lerp(bounds.minX, bounds.maxX, Math.random()),
        resolveWeatherCloudAltitude(bounds.modelTop, bounds.skyPadding, Math.random()),
        THREE.MathUtils.lerp(bounds.minZ, bounds.maxZ, Math.random()),
      );
      sprite.renderOrder = -1;
      this.weatherGroup.add(sprite);
      this.weatherClouds.push({
        sprite,
        speed: preset.cloud.speed * THREE.MathUtils.lerp(0.5, 1.4, Math.random()),
        minX: bounds.minX - wrapPadding,
        maxX: bounds.maxX + wrapPadding,
        minZ: bounds.minZ - wrapPadding,
        maxZ: bounds.maxZ + wrapPadding,
      });
    }
  }

  private createCloudTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 96;
    const context = canvas.getContext("2d");
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      const circles = [
        [58, 54, 34],
        [96, 42, 46],
        [142, 52, 38],
        [184, 48, 30],
      ];
      for (const [x, y, radius] of circles) {
        const gradient = context.createRadialGradient(x, y, 4, x, y, radius);
        gradient.addColorStop(0, "rgba(255,255,255,0.92)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private addSunnyGlow() {
    const texture = this.createSunTexture();
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: 0xfff4c2,
      transparent: true,
      opacity: resolveWeatherSunOpacity(0.58),
      depthWrite: false,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(material);
    const bounds = this.getWeatherBounds();
    sprite.position.set(bounds.maxX - 2, bounds.maxY - 1, bounds.minZ + 2);
    const scale = resolveWeatherSunScale(2.5, this.getWeatherSceneSpan());
    sprite.scale.set(scale, scale, 1);
    sprite.renderOrder = -5;
    this.weatherGroup.add(sprite);
  }

  private createSunTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (context) {
      const gradient = context.createRadialGradient(64, 64, 6, 64, 64, 64);
      gradient.addColorStop(0, "rgba(255,255,230,1)");
      gradient.addColorStop(0.24, "rgba(255,218,120,0.9)");
      gradient.addColorStop(1, "rgba(255,190,80,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createHaPanelMarker(id: string, objectIds: string[]): HaPanelMarker {
    const group = new THREE.Group();
    group.name = `HA active panel marker ${id}`;
    group.userData.selectable = false;
    this.scene.add(group);
    return { group, helpers: [], objectIds };
  }

  private updateHaPanelMarkers() {
    if (this.haPanelMarkers.size === 0) {
      return;
    }
    for (const [id, marker] of this.haPanelMarkers) {
      const objects = marker.objectIds
        .map((objectId) => this.objectMap.get(objectId))
        .filter((object): object is THREE.Object3D => Boolean(object));
      if (objects.length === 0) {
        this.disposeHaPanelMarker(marker);
        this.haPanelMarkers.delete(id);
        continue;
      }
      if (marker.helpers.length !== objects.length) {
        for (const helper of marker.helpers) {
          marker.group.remove(helper);
          helper.geometry.dispose();
        }
        marker.helpers = objects.map((object) => {
          const helper = new THREE.BoxHelper(object, 0x29d3c4);
          helper.material.depthTest = false;
          helper.renderOrder = 24;
          helper.userData.selectable = false;
          marker.group.add(helper);
          return helper;
        });
      }
      marker.helpers.forEach((helper, index) => {
        helper.setFromObject(objects[index]);
      });
    }
  }

  private disposeHaPanelMarker(marker: HaPanelMarker) {
    this.scene.remove(marker.group);
    for (const helper of marker.helpers) {
      helper.geometry.dispose();
    }
    marker.group.clear();
  }

  private clearHaPanelMarkers() {
    for (const marker of this.haPanelMarkers.values()) {
      this.disposeHaPanelMarker(marker);
    }
    this.haPanelMarkers.clear();
  }

  private addLightningEffect() {
    const bounds = this.getWeatherBounds();
    const span = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, 24);
    const sceneSpan = this.getWeatherSceneSpan();
    const weatherScale = resolveWeatherScale(sceneSpan);
    const light = new THREE.PointLight(0xdcefff, 0, Math.max(span * 2.4, 120));
    light.position.set(bounds.center.x, bounds.maxY - 2, bounds.center.z);
    light.castShadow = false;
    this.weatherLightningLight = light;
    this.weatherGroup.add(light);
    this.addLightningSkyFlash(bounds, span);

    const points: THREE.Vector3[] = [];
    const startX =
      bounds.center.x + THREE.MathUtils.lerp(-3, 3, Math.random()) * weatherScale;
    const startZ =
      bounds.center.z + THREE.MathUtils.lerp(-3, 3, Math.random()) * weatherScale;
    for (let index = 0; index < 8; index += 1) {
      const ratio = index / 7;
      points.push(
        new THREE.Vector3(
          startX + THREE.MathUtils.lerp(-0.8, 0.8, Math.random()) * weatherScale,
          THREE.MathUtils.lerp(
            bounds.maxY - weatherScale,
            bounds.minY + 2 * weatherScale,
            ratio,
          ),
          startZ + THREE.MathUtils.lerp(-0.8, 0.8, Math.random()) * weatherScale,
        ),
      );
    }
    const geometry = this.createLightningGeometry(points, sceneSpan);
    const material = new THREE.MeshBasicMaterial({
      color: 0xe8f5ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.weatherLightningBolt = new THREE.Mesh(geometry, material);
    this.weatherLightningBolt.name = "weather lightning";
    this.weatherLightningBolt.frustumCulled = false;
    this.weatherGroup.add(this.weatherLightningBolt);
  }

  private createLightningGeometry(points: THREE.Vector3[], sceneSpan: number) {
    const curve = new THREE.CatmullRomCurve3(points);
    const radius = resolveWeatherLightningRadius(sceneSpan);
    return new THREE.TubeGeometry(curve, Math.max(points.length * 5, 32), radius, 8, false);
  }

  private addLightningSkyFlash(bounds: WeatherBounds, span: number) {
    const texture = this.createLightningFlashTexture();
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: 0xcfe9ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(bounds.center.x, bounds.maxY - 1, bounds.center.z);
    sprite.scale.set(span * 1.65, span * 0.9, 1);
    sprite.renderOrder = 20;
    this.weatherLightningSkyFlash = sprite;
    this.weatherGroup.add(sprite);
  }

  private createLightningFlashTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 160;
    const context = canvas.getContext("2d");
    if (context) {
      const gradient = context.createRadialGradient(128, 58, 8, 128, 58, 128);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.28, "rgba(160,215,255,0.72)");
      gradient.addColorStop(1, "rgba(90,150,255,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private updateWeatherEffects() {
    const now = performance.now();
    const delta = this.lastFrameTime > 0 ? Math.min((now - this.lastFrameTime) / 16.67, 3) : 1;
    this.lastFrameTime = now;
    if (
      !this.weatherRain &&
      !this.weatherWind &&
      this.weatherClouds.length === 0 &&
      !this.weatherLightningLight
    ) {
      return;
    }
    if (this.weatherRain) {
      updateRainLineEffect(this.weatherRain, delta, now * 0.001);
    }
    if (this.weatherWind) {
      updateWindLineEffect(this.weatherWind, delta);
    }
    for (const cloud of this.weatherClouds) {
      cloud.sprite.position.x += cloud.speed * delta;
      if (cloud.sprite.position.x > cloud.maxX) {
        cloud.sprite.position.x = cloud.minX;
        cloud.sprite.position.z = THREE.MathUtils.lerp(
          cloud.minZ,
          cloud.maxZ,
          Math.random(),
        );
      }
    }
    this.updateLightning(delta);
  }

  private updateLightning(delta: number) {
    const preset = getWeatherPreset(this.weatherConfig.mode);
    if (!preset.lightning.enabled || !this.weatherLightningLight) {
      return;
    }
    this.weatherLightningCooldownFrames = Math.max(
      this.weatherLightningCooldownFrames - delta,
      0,
    );
    if (this.weatherLightningCooldownFrames === 0) {
      this.triggerLightningBurst(preset);
    }
    if (this.weatherLightningBurstFrames > 0) {
      const frame = Math.ceil(this.weatherLightningBurstFrames);
      const ratio = this.weatherLightningBurstFrames / preset.lightning.burstFrames;
      const pulse = frame % 3 === 0 ? 1 : frame % 2 === 0 ? 0.32 : 0.72;
      this.weatherLightningFlash = preset.lightning.intensity * ratio * pulse;
      this.weatherLightningBurstFrames = Math.max(
        this.weatherLightningBurstFrames - delta,
        0,
      );
    } else {
      this.weatherLightningFlash *= 0.68 ** delta;
    }
    this.weatherLightningLight.intensity = this.weatherLightningFlash;
    this.applyLightningFlashLighting(preset);
    if (this.weatherLightningBolt) {
      const material = this.weatherLightningBolt.material;
      material.opacity = Math.min(this.weatherLightningFlash / preset.lightning.intensity, 1);
    }
    if (this.weatherLightningSkyFlash) {
      const material = this.weatherLightningSkyFlash.material as THREE.SpriteMaterial;
      material.opacity =
        Math.min(this.weatherLightningFlash / preset.lightning.intensity, 1) * 0.42;
    }
  }

  private applyLightningFlashLighting(preset: WeatherPreset) {
    const flashRatio = Math.min(
      this.weatherLightningFlash / Math.max(preset.lightning.intensity, 1),
      1,
    );
    this.ambient.intensity =
      this.environmentConfig.ambientIntensity * preset.lighting.ambientMultiplier +
      flashRatio * 0.85;
    this.directional.intensity =
      this.environmentConfig.directionalIntensity *
        preset.lighting.directionalMultiplier +
      flashRatio * 1.35;
    if (this.renderer) {
      this.renderer.toneMappingExposure = resolveToneMappingExposure({
        exposure: this.environmentConfig.exposure,
        weatherExposureOffset: preset.lighting.exposureOffset,
        lightningExposureBoost: flashRatio * 0.26,
        realisticRenderingEnabled: this.performanceConfig.realisticRenderingEnabled,
      });
    }
  }

  private triggerLightningBurst(preset: WeatherPreset) {
    this.weatherLightningBurstFrames = preset.lightning.burstFrames;
    this.weatherLightningFlash = preset.lightning.intensity;
    this.weatherLightningCooldownFrames = resolveWeatherLightningCooldownFrames(
      Math.random(),
    );
    this.randomizeLightningBolt();
  }

  private randomizeLightningBolt() {
    if (!this.weatherLightningBolt) {
      return;
    }
    const bounds = this.getWeatherBounds();
    const sceneSpan = this.getWeatherSceneSpan();
    const weatherScale = resolveWeatherScale(sceneSpan);
    const points: THREE.Vector3[] = [];
    const strikePosition = resolveWeatherLightningStrikePosition(
      bounds,
      Math.random(),
      Math.random(),
    );
    const startX = strikePosition.x;
    const startZ = strikePosition.z;
    this.weatherLightningLight?.position.set(startX, bounds.maxY - 2, startZ);
    this.weatherLightningSkyFlash?.position.set(startX, bounds.maxY - 1, startZ);
    for (let index = 0; index < 9; index += 1) {
      const ratio = index / 8;
      points.push(
        new THREE.Vector3(
          startX + THREE.MathUtils.lerp(-1.1, 1.1, Math.random()) * weatherScale,
          THREE.MathUtils.lerp(
            bounds.maxY - 0.8 * weatherScale,
            bounds.minY + 1.5 * weatherScale,
            ratio,
          ),
          startZ + THREE.MathUtils.lerp(-1.1, 1.1, Math.random()) * weatherScale,
        ),
      );
    }
    this.weatherLightningBolt.geometry.dispose();
    this.weatherLightningBolt.geometry = this.createLightningGeometry(points, sceneSpan);
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

  private enableObjectEmission(
    object: THREE.Object3D,
    lightConfig: ReturnType<typeof resolveLightCapability>,
  ) {
    const { emissiveIntensity, lightIntensity } =
      resolveLightRenderIntensity(lightConfig);
    const color = colorTemperatureToColor(lightConfig.colorTemperatureKelvin);

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
          standard.emissiveIntensity = emissiveIntensity;
          standard.needsUpdate = true;
        }
      }
    });

    const rig = this.ensureHaLightRig(object.uuid, lightConfig.lightType);
    rig.group.visible = true;
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const range = Math.max(lightConfig.lightRange, 1);
    const yOffset = Math.max(size.y * 0.18, 0.12);
    const bottomOffset = Math.max(size.y * 0.08, 0.08);
    rig.light.color.copy(color);
    rig.light.visible = true;

    if (lightConfig.lightType === "spot") {
      const spot = rig.light as THREE.SpotLight;
      spot.position.set(center.x, box.max.y + yOffset, center.z);
      spot.intensity = lightIntensity * 2.2;
      spot.angle = THREE.MathUtils.degToRad(lightConfig.coneAngle);
      spot.penumbra = 0.58;
      spot.distance = range;
      spot.decay = 1.25;
      spot.target.position.set(
        center.x,
        lightConfig.emissionMode === "bottom" ? box.min.y - 1 : center.y,
        center.z,
      );
      spot.target.updateMatrixWorld();
      return;
    }

    if (lightConfig.lightType === "area") {
      const area = rig.light as THREE.RectAreaLight;
      area.position.set(
        center.x,
        lightConfig.emissionMode === "bottom" ? box.min.y - bottomOffset : box.max.y + yOffset,
        center.z,
      );
      area.width = Math.max(size.x, 0.6);
      area.height = Math.max(size.z, 0.6);
      area.intensity = lightIntensity * 4;
      area.lookAt(
        center.x,
        lightConfig.emissionMode === "bottom" ? box.min.y - 1 : center.y,
        center.z,
      );
      return;
    }

    const point = rig.light as THREE.PointLight;
    point.position.copy(
      lightConfig.emissionMode === "bottom"
        ? new THREE.Vector3(center.x, box.min.y - bottomOffset, center.z)
        : new THREE.Vector3(center.x, center.y, center.z),
    );
    point.intensity = lightIntensity;
    point.distance = range;
    point.decay = 1;
  }

  private ensureHaLightRig(uuid: string, type: HaLightCapabilityConfig["lightType"]) {
    const existing = this.haLights.get(uuid);
    if (existing?.type === type) {
      return existing;
    }
    if (existing) {
      this.disposeHaLightRig(existing);
      this.haLights.delete(uuid);
    }

    const group = new THREE.Group();
    group.name = `HA light rig ${uuid}`;
    let light: HaLightObject;
    if (type === "spot") {
      const spot = new THREE.SpotLight(
        0xffffff,
        1,
        12,
        THREE.MathUtils.degToRad(45),
        0.58,
        1.25,
      );
      spot.castShadow = false;
      group.add(spot);
      group.add(spot.target);
      light = spot;
    } else if (type === "area") {
      const area = new THREE.RectAreaLight(0xffffff, 1, 1, 1);
      area.castShadow = false;
      group.add(area);
      light = area;
    } else {
      const point = new THREE.PointLight(0xffffff, 1, 12, 1);
      point.castShadow = false;
      group.add(point);
      light = point;
    }

    this.scene.add(group);
    const rig = { type, group, light };
    this.haLights.set(uuid, rig);
    return rig;
  }

  private disposeHaLightRig(rig: HaLightRig) {
    this.scene.remove(rig.group);
    rig.light.dispose();
    rig.group.clear();
  }

  private clearHaLights() {
    for (const rig of this.haLights.values()) {
      this.disposeHaLightRig(rig);
    }
    this.haLights.clear();
  }

  private clearHaLightForObject(uuid: string) {
    const rig = this.haLights.get(uuid);
    if (!rig) {
      return;
    }
    this.disposeHaLightRig(rig);
    this.haLights.delete(uuid);
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
    const rig = this.haLights.get(object.uuid);
    if (rig) {
      rig.group.visible = false;
    }
  }

  private handleTransformStart = () => {
    const objects = this.getSelectedObjects();
    this.clearHaCoverAnimationsForObjects(objects);
    this.updateTransformControls();
    this.transformStartPivot.copy(this.transformPivot.position);
    this.transformPreviousPivot.copy(this.transformPivot.position);
    this.transformStartQuaternion.copy(this.transformPivot.quaternion);
    this.transformStartPositions.clear();
    this.transformStartWorldQuaternions.clear();
    this.transformStartSnapshots = this.captureSnapshots(objects);
    for (const object of objects) {
      this.transformStartPositions.set(
        object.uuid,
        object.getWorldPosition(new THREE.Vector3()),
      );
      this.transformStartWorldQuaternions.set(
        object.uuid,
        object.getWorldQuaternion(new THREE.Quaternion()),
      );
    }
  };

  private handleTransformChange = () => {
    const objects = this.getSelectedObjects();
    if (this.transformMode === "rotate") {
      const rotationDelta = this.transformStartQuaternion
        .clone()
        .invert()
        .premultiply(this.transformPivot.quaternion);
      this.rotateObjectsAroundWorldCenter(
        objects,
        this.transformStartPivot,
        rotationDelta,
        this.transformStartPositions,
        this.transformStartWorldQuaternions,
      );
    } else {
      const deltaValues = getIncrementalTransformDelta(
        this.transformPreviousPivot,
        this.transformPivot.position,
      );
      const delta = new THREE.Vector3(deltaValues.x, deltaValues.y, deltaValues.z);
      this.translateObjectsByWorldDelta(objects, delta);
      this.transformPreviousPivot.copy(this.transformPivot.position);
    }
    this.updateSelectionBox();
  };

  private handleTransformEnd = () => {
    const objects = this.getSelectedObjects();
    const before = this.transformStartSnapshots;
    const after = this.captureSnapshots(objects);
    this.transformStartPositions.clear();
    this.transformStartWorldQuaternions.clear();
    this.transformStartSnapshots = [];
    this.updateTransformControls();
    this.options.onModelChange?.();
    this.pushTransformHistory(
      this.transformMode === "rotate" ? "旋转零件" : "移动零件",
      before,
      after,
    );
  };

  private handleTransformDraggingChange = (event: { value: unknown }) => {
    if (!this.controls) {
      return;
    }
    if (this.isFirstPersonActive()) {
      this.controls.enabled = false;
      return;
    }
    this.controls.enabled = event.value !== true;
  };

  private handleFirstPersonKeyDown = (event: KeyboardEvent) => {
    this.handleFirstPersonKeyboardEvent(event, true);
  };

  private handleFirstPersonKeyUp = (event: KeyboardEvent) => {
    this.handleFirstPersonKeyboardEvent(event, false);
  };

  private handleFirstPersonKeyboardEvent(event: KeyboardEvent, active: boolean) {
    if (!this.isFirstPersonActive() || this.isEditableKeyboardTarget(event.target)) {
      return;
    }
    const direction = this.resolveFirstPersonKeyDirection(event.code);
    if (direction) {
      this.setFirstPersonMoveDirection(direction, active);
      event.preventDefault();
      return;
    }
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
      this.firstPersonMoveState.fast = active;
      event.preventDefault();
    }
  }

  private resolveFirstPersonKeyDirection(code: string): FirstPersonDirection | null {
    if (code === "KeyW" || code === "ArrowUp") {
      return "forward";
    }
    if (code === "KeyS" || code === "ArrowDown") {
      return "backward";
    }
    if (code === "KeyA" || code === "ArrowLeft") {
      return "left";
    }
    if (code === "KeyD" || code === "ArrowRight") {
      return "right";
    }
    return null;
  }

  private isEditableKeyboardTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    const tagName = target.tagName.toLowerCase();
    return (
      ["input", "textarea", "select"].includes(tagName) ||
      target.isContentEditable
    );
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
      if (!node.visible) {
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
