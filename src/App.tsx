import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { PartsTree } from "./components/editor/PartsTree";
import { RightInspector } from "./components/editor/RightInspector";
import { HaBindingDialog } from "./components/editor/HaBindingDialog";
import { HaFloatingPanel } from "./components/editor/HaFloatingPanel";
import { TopToolbar } from "./components/editor/TopToolbar";
import { Viewport } from "./components/editor/Viewport";
import { useHomeAssistant } from "./hooks/useHomeAssistant";
import {
  closeHaFloatingPanel,
  openHaFloatingPanel,
  removeMissingHaFloatingPanels,
  shouldUpdateFloatingPanelAnchors,
  type HaFloatingPanelState,
} from "./lib/ha-floating-panels";
import { addHaBinding, getBoundEntityIds } from "./lib/ha-bindings";
import { isFullscreen, toggleFullscreen } from "./lib/fullscreen";
import {
  loadEditorLocalConfig,
  normalizePerformanceConfig,
  saveEditorLocalConfig,
  type EditorLocalConfig,
} from "./lib/editor-local-config";
import { defaultHaRuntimeConfig, type HaRuntimeConfig } from "./lib/ha-config";
import { cn } from "./lib/utils";
import { defaultWeather, type WeatherConfig } from "./lib/weather-presets";
import { fetchQWeatherNow } from "./lib/qweather";
import { getSolarEnvironmentPreset } from "./lib/environment-lighting";
import {
  MODEL_LIBRARY_DRAG_TYPE,
  isSupportedModelFile,
  modelLibraryItems,
  parseModelLibraryDragItem,
  serializeModelLibraryDragItem,
  type ModelLibraryItem,
} from "./lib/model-library";
import {
  buildModelTree,
  getObjectMetadata,
  getSelectionTransformInfo,
  shouldHandleDeleteKey,
} from "./lib/model-tree";
import type { EditorHistoryState } from "./lib/editor-history";
import type { ThreeEditor } from "./lib/three-editor";
import { Loader2 } from "lucide-react";
import type {
  HaBinding,
  HaCoverCapabilityConfig,
  HaLightCapabilityConfig,
  HaManualDeviceType,
} from "./types/ha";
import type {
  EnvironmentConfig,
  ModelTreeNode,
  ObjectMetadata,
  PerformanceConfig,
  PreviewCameraMode,
  SelectionTransformInfo,
  ViewMode,
  Vector3Values,
} from "./types/editor";
import { defaultEnvironment, defaultPerformance } from "./types/editor";
import { Button } from "./components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";

function anchorsEqual(
  current: Record<string, { x: number; y: number } | null>,
  next: Record<string, { x: number; y: number } | null>,
) {
  const currentKeys = Object.keys(current);
  const nextKeys = Object.keys(next);
  if (currentKeys.length !== nextKeys.length) {
    return false;
  }
  return nextKeys.every((key) => {
    const currentPoint = current[key];
    const nextPoint = next[key];
    if (!currentPoint || !nextPoint) {
      return currentPoint === nextPoint;
    }
    return (
      Math.abs(currentPoint.x - nextPoint.x) < 0.5 &&
      Math.abs(currentPoint.y - nextPoint.y) < 0.5
    );
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function isSupportedModel(file: File) {
  return isSupportedModelFile(file);
}

const FLOATING_PANEL_ANCHOR_UPDATE_INTERVAL_MS = 50;

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  return (
    ["input", "textarea", "select"].includes(tagName) ||
    target.isContentEditable ||
    target.contentEditable === "true"
  );
}

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const configInputRef = useRef<HTMLInputElement | null>(null);
  const libraryFileInputRef = useRef<HTMLInputElement | null>(null);
  const [editor, setEditor] = useState<ThreeEditor | null>(null);
  const [tree, setTree] = useState<ModelTreeNode | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewCameraMode, setPreviewCameraMode] =
    useState<PreviewCameraMode>("manual");
  const [fullscreen, setFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("perspective");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelVersion, setModelVersion] = useState(0);
  const [historyState, setHistoryState] = useState<EditorHistoryState>({
    canUndo: false,
    canRedo: false,
    isDirty: false,
  });
  const [bindingDialogOpen, setBindingDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportingMode, setExportingMode] = useState<"compressed" | "default" | null>(
    null,
  );
  const [objectMenu, setObjectMenu] = useState<{
    x: number;
    y: number;
    uuid: string;
  } | null>(null);
  const [floatingPanels, setFloatingPanels] = useState<HaFloatingPanelState[]>([]);
  const [floatingAnchors, setFloatingAnchors] = useState<
    Record<string, { x: number; y: number } | null>
  >({});
  const localConfigRef = useRef<EditorLocalConfig | null>(loadEditorLocalConfig());
  const [haConfig, setHaConfig] = useState<HaRuntimeConfig>(
    localConfigRef.current?.ha ?? defaultHaRuntimeConfig(),
  );
  const ha = useHomeAssistant(haConfig);
  const [environment, setEnvironment] = useState<EnvironmentConfig>(
    localConfigRef.current?.environment ?? defaultEnvironment,
  );
  const [performanceConfig, setPerformanceConfig] = useState<PerformanceConfig>(
    localConfigRef.current?.performance ?? defaultPerformance,
  );
  const [weather, setWeather] = useState<WeatherConfig>(
    localConfigRef.current?.weather ?? defaultWeather,
  );
  const [weatherStatus, setWeatherStatus] = useState<string | null>(null);

  useEffect(() => {
    const handleFullscreenChange = () => setFullscreen(isFullscreen());
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    handleFullscreenChange();
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const refreshTree = useCallback(() => {
    const root = editor?.getRoot();
    setTree(root ? buildModelTree(root) : null);
  }, [editor]);

  const metadata: ObjectMetadata | null = useMemo(() => {
    const selectedId = selectedIds[0];
    if (!editor || !selectedId) {
      return null;
    }
    const object = editor.getObject(selectedId);
    return object ? getObjectMetadata(object) : null;
  }, [editor, selectedIds, modelVersion, tree]);

  const selectionTransform: SelectionTransformInfo | null = useMemo(() => {
    if (!editor || selectedIds.length === 0) {
      return null;
    }
    const objects = selectedIds
      .map((id) => editor.getObject(id))
      .filter((object): object is NonNullable<typeof object> => Boolean(object));
    return getSelectionTransformInfo(objects);
  }, [editor, selectedIds, modelVersion, tree]);

  const selectionBindings = useMemo(() => {
    if (!editor || selectedIds.length === 0) {
      return [];
    }
    return editor.getSelectedBindings();
  }, [editor, modelVersion, selectedIds]);

  const floatingPanelData = useMemo(
    () =>
      floatingPanels.map((panel) => ({
        ...panel,
        bindings: editor?.getBindingsForObjects(panel.objectIds) ?? [],
        coverCapability: editor?.getCoverCapabilityForObjects(panel.objectIds) ?? null,
        lightCapability: editor?.getLightCapabilityForObjects(panel.objectIds) ?? null,
      })),
    [editor, floatingPanels, modelVersion],
  );

  useEffect(() => {
    let frame = 0;
    let lastAnchorUpdateTime = 0;
    const updateAnchors = () => {
      const now = performance.now();
      if (!editor) {
        setFloatingAnchors((current) =>
          Object.keys(current).length === 0 ? current : {},
        );
        frame = window.requestAnimationFrame(updateAnchors);
        return;
      }
      if (floatingPanels.length === 0) {
        setFloatingAnchors((current) =>
          Object.keys(current).length === 0 ? current : {},
        );
        frame = window.requestAnimationFrame(updateAnchors);
        return;
      }
      if (
        !shouldUpdateFloatingPanelAnchors({
          now,
          lastUpdateTime: lastAnchorUpdateTime,
          intervalMs: FLOATING_PANEL_ANCHOR_UPDATE_INTERVAL_MS,
        })
      ) {
        frame = window.requestAnimationFrame(updateAnchors);
        return;
      }
      lastAnchorUpdateTime = now;
      setFloatingAnchors((current) => {
        const next: Record<string, { x: number; y: number } | null> = {};
        for (const panel of floatingPanels) {
          next[panel.id] = editor.getScreenAnchorForObjects(panel.objectIds);
        }
        return anchorsEqual(current, next) ? current : next;
      });
      frame = window.requestAnimationFrame(updateAnchors);
    };
    frame = window.requestAnimationFrame(updateAnchors);
    return () => window.cancelAnimationFrame(frame);
  }, [editor, floatingPanels, viewMode]);

  useEffect(() => {
    if (!editor || floatingPanels.length === 0) {
      return;
    }
    const existingObjectIds = new Set(
      floatingPanels
        .flatMap((panel) => panel.objectIds)
        .filter((objectId) => Boolean(editor.getObject(objectId))),
    );
    setFloatingPanels((panels) =>
      removeMissingHaFloatingPanels(panels, existingObjectIds),
    );
  }, [editor, floatingPanels, modelVersion]);

  useEffect(() => {
    if (!editor || selectedIds.length === 0) {
      return;
    }
    const bindings = editor.getBindingsForObjects(selectedIds);
    if (getBoundEntityIds(bindings).length === 0) {
      return;
    }
    setFloatingPanels((panels) => openHaFloatingPanel(panels, selectedIds));
  }, [editor, modelVersion, selectedIds]);

  useEffect(() => {
    editor?.setEnvironment(environment);
  }, [editor, environment]);

  useEffect(() => {
    editor?.setWeather(weather);
  }, [editor, weather]);

  useEffect(() => {
    if (!(environment.realtimeTimeEnabled ?? true)) {
      return;
    }
    const applyCurrentTime = () => {
      const hour = new Date().getHours();
      setEnvironment((current) => ({
        ...getSolarEnvironmentPreset(hour, current),
        realtimeTimeEnabled: true,
      }));
    };
    applyCurrentTime();
    const timer = window.setInterval(applyCurrentTime, 60_000);
    return () => window.clearInterval(timer);
  }, [environment.realtimeTimeEnabled]);

  useEffect(() => {
    if (!(weather.realtimeEnabled ?? true)) {
      setWeatherStatus(null);
      return;
    }
    if (!weather.qweatherApiKey?.trim() || !weather.qweatherLocation?.trim()) {
      setWeatherStatus("实时天气：请配置和风天气 API Key 和位置");
      return;
    }
    let cancelled = false;
    const loadRealtimeWeather = async () => {
      setWeatherStatus("实时天气：更新中");
      try {
        const result = await fetchQWeatherNow({
          apiKey: weather.qweatherApiKey?.trim() ?? "",
          location: weather.qweatherLocation?.trim() ?? "",
          apiHost: weather.qweatherApiHost?.trim() || undefined,
        });
        if (cancelled) {
          return;
        }
        setWeather((current) =>
          current.realtimeEnabled
            ? {
                ...current,
                mode: result.mode,
              }
            : current,
        );
        setWeatherStatus(`实时天气：${result.now.text ?? result.mode}`);
      } catch (weatherError) {
        if (!cancelled) {
          setWeatherStatus(
            weatherError instanceof Error
              ? weatherError.message
              : "实时天气更新失败",
          );
        }
      }
    };
    void loadRealtimeWeather();
    const timer = window.setInterval(loadRealtimeWeather, 10 * 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    weather.realtimeEnabled,
    weather.qweatherApiKey,
    weather.qweatherLocation,
    weather.qweatherApiHost,
  ]);

  useEffect(() => {
    editor?.setViewMode(viewMode);
    if (viewMode === "perspective") {
      editor?.setEnvironment(environment);
    }
  }, [editor, viewMode]);

  useEffect(() => {
    editor?.setPreviewMode(previewMode);
    if (!previewMode) {
      editor?.setEnvironment(environment);
    } else {
      setBindingDialogOpen(false);
    }
  }, [editor, environment, previewMode]);

  useEffect(() => {
    editor?.setPreviewCameraMode(previewCameraMode);
  }, [editor, previewCameraMode]);

  useEffect(() => {
    editor?.applyHaStates(ha.states);
  }, [editor, ha.states, modelVersion]);

  useEffect(() => {
    editor?.setHaPanelMarkers(
      floatingPanels.map((panel) => ({
        id: panel.id,
        objectIds: panel.objectIds,
      })),
    );
  }, [editor, floatingPanels]);

  useEffect(() => {
    return () => editor?.setHaPanelMarkers([]);
  }, [editor]);

  useEffect(() => {
    const nextConfig =
      editor?.createLocalConfig(environment, weather, haConfig, performanceConfig) ?? {
        version: 1,
        environment,
        performance: performanceConfig,
        weather,
        ha: haConfig,
        objects: localConfigRef.current?.objects ?? {},
      };
    localConfigRef.current = nextConfig;
    saveEditorLocalConfig(nextConfig);
  }, [editor, environment, haConfig, modelVersion, performanceConfig, weather]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!historyState.isDirty) {
        return;
      }
      event.preventDefault();
      event.returnValue = "当前模型有未导出的编辑，离开页面将丢失这些改动。";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [historyState.isDirty]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setObjectMenu(null);
      }
      if (previewMode) {
        return;
      }
      const isUndo =
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        event.key.toLowerCase() === "z";
      const isRedo =
        (event.ctrlKey || event.metaKey) &&
        (event.key.toLowerCase() === "y" ||
          (event.shiftKey && event.key.toLowerCase() === "z"));

      if ((isUndo || isRedo) && !isEditableTarget(event.target)) {
        event.preventDefault();
        if (isUndo) {
          editor?.undo();
        } else {
          editor?.redo();
        }
        refreshTree();
        return;
      }

      if (!shouldHandleDeleteKey(event)) {
        return;
      }
      if (editor?.deleteSelected()) {
        refreshTree();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editor, previewMode, refreshTree]);

  useEffect(() => {
    const closeObjectMenu = () => setObjectMenu(null);
    window.addEventListener("click", closeObjectMenu);
    window.addEventListener("scroll", closeObjectMenu, true);
    return () => {
      window.removeEventListener("click", closeObjectMenu);
      window.removeEventListener("scroll", closeObjectMenu, true);
    };
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportConfigClick = () => {
    configInputRef.current?.click();
  };

  const handleLibraryUploadClick = () => {
    libraryFileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) {
      return;
    }
    if (
      historyState.isDirty &&
      !window.confirm("当前模型有未导出的编辑，继续上传新模型将忽略这些改动。是否继续？")
    ) {
      return;
    }
    if (!isSupportedModel(file)) {
      setError("仅支持上传 .glb、.gltf 或 .obj 模型文件。");
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const root = await editor.loadModel(file);
      editor.applyLocalConfig(localConfigRef.current);
      const nextTree = buildModelTree(root);
      setTree(nextTree);
      editor.selectObject(root.uuid);
    } catch (loadError) {
      setTree(null);
      setSelectedIds([]);
      setError(loadError instanceof Error ? loadError.message : "模型加载失败。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as EditorLocalConfig;
      if (parsed.version !== 1 || !parsed.environment || !parsed.weather || !parsed.objects) {
        throw new Error("配置文件格式不正确。");
      }
      localConfigRef.current = parsed;
      saveEditorLocalConfig(parsed);
      setEnvironment({ ...defaultEnvironment, ...(parsed.environment ?? {}) });
      setPerformanceConfig(normalizePerformanceConfig(parsed.performance));
      setWeather({ ...defaultWeather, ...(parsed.weather ?? {}) });
      setHaConfig(parsed.ha ?? defaultHaRuntimeConfig());
      editor?.applyLocalConfig(parsed);
      refreshTree();
      setError(null);
    } catch (configError) {
      setError(configError instanceof Error ? configError.message : "配置导入失败。");
    }
  };

  const handleLibraryFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) {
      return;
    }
    if (!isSupportedModelFile(file)) {
      setError("仅支持上传 .glb、.gltf 或 .obj 模型文件。");
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await editor.addModelFromFile(file);
      refreshTree();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "模型加载失败。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLibraryModel = async (
    item: ModelLibraryItem,
    placement?: { clientX: number; clientY: number },
  ) => {
    if (!editor) {
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await editor.addModelFromUrl(item.url, item.name, placement);
      refreshTree();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "模型加载失败。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBeginModelDrag = (
    event: DragEvent<HTMLElement>,
    item: ModelLibraryItem,
  ) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      MODEL_LIBRARY_DRAG_TYPE,
      serializeModelLibraryDragItem(item),
    );
    event.dataTransfer.setData("text/plain", item.name);
  };

  const handleViewportDrop = async (
    dataTransfer: DataTransfer,
    point: { clientX: number; clientY: number },
  ) => {
    const payload = dataTransfer.getData(MODEL_LIBRARY_DRAG_TYPE);
    const item = payload ? parseModelLibraryDragItem(payload) : null;
    if (!item) {
      return;
    }
    await handleAddLibraryModel(item, point);
  };

  const canDropLibraryModel = (dataTransfer: DataTransfer) =>
    Array.from(dataTransfer.types).includes(MODEL_LIBRARY_DRAG_TYPE);

  const handleLoadSample = async () => {
    if (!editor) {
      return;
    }
    if (
      historyState.isDirty &&
      !window.confirm("当前模型有未导出的编辑，加载示例将忽略这些改动。是否继续？")
    ) {
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const root = await editor.loadModelFromUrl("/sample/smart-home.glb", "全屋智能家居模型");
      editor.applyLocalConfig(localConfigRef.current);
      setTree(buildModelTree(root));
      editor.selectObject(root.uuid);
    } catch (sampleError) {
      setTree(null);
      setSelectedIds([]);
      setError(sampleError instanceof Error ? sampleError.message : "示例模型加载失败。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (uuid: string) => {
    editor?.selectObject(uuid);
  };

  const handleExportModel = async (compressed = false) => {
    if (!editor) {
      return;
    }
    setExportingMode(compressed ? "compressed" : "default");
    try {
      const blob = await editor.exportGlb({ compressed });
      downloadBlob(blob, compressed ? "smart-home-model-draco.glb" : "smart-home-model.glb");
      editor.markSaved();
      setExportDialogOpen(false);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "导出失败。");
    } finally {
      setExportingMode(null);
    }
  };

  const handleExportConfig = () => {
    const config =
      editor?.createLocalConfig(environment, weather, haConfig, performanceConfig) ??
      localConfigRef.current ??
      {
        version: 1,
        environment,
        performance: performanceConfig,
        weather,
        ha: haConfig,
        objects: {},
      };
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, "3dhome-editor-config.json");
    setExportDialogOpen(false);
  };

  const handleEnvironmentChange = (config: EnvironmentConfig) => {
    setEnvironment(config);
  };

  const handlePositionChange = (position: Vector3Values) => {
    const selectedId = selectedIds[0];
    if (!editor || !selectedId || selectedIds.length !== 1) {
      return;
    }
    editor.updatePosition(selectedId, position);
    refreshTree();
  };

  const handleScaleChange = (scale: Vector3Values) => {
    if (!editor || selectedIds.length !== 1) {
      return;
    }
    editor.updateSelectionScale(scale);
    refreshTree();
  };

  const handleSizeChange = (size: Vector3Values) => {
    editor?.resizeSelection(size);
    refreshTree();
  };

  const handleCenterChange = (center: Vector3Values) => {
    editor?.updateSelectionCenter(center);
    refreshTree();
  };

  const handleUniformScale = (multiplier: number) => {
    editor?.scaleSelectionUniform(multiplier);
    refreshTree();
  };

  const handleDeleteSelected = () => {
    if (editor?.deleteSelected()) {
      refreshTree();
    }
    setObjectMenu(null);
  };

  const handleDuplicateSelected = () => {
    if (editor?.duplicateSelected()) {
      refreshTree();
    }
    setObjectMenu(null);
  };

  const handleGroupSelected = () => {
    if (editor?.groupSelectedObjects()) {
      refreshTree();
    }
  };

  const handleBindingsChange = (bindings: HaBinding[]) => {
    editor?.updateBindingsForSelection(bindings);
    setModelVersion((version) => version + 1);
  };

  const handleLightCapabilityChange = (config: HaLightCapabilityConfig) => {
    editor?.updateLightCapabilityForSelection(config);
    setModelVersion((version) => version + 1);
  };

  const handleCoverCapabilityChange = (config: HaCoverCapabilityConfig) => {
    editor?.updateCoverCapabilityForSelection(config);
    setModelVersion((version) => version + 1);
  };

  const handleManualDeviceTypeChange = (deviceType: HaManualDeviceType) => {
    editor?.updateManualDeviceTypeForSelection(deviceType);
    setModelVersion((version) => version + 1);
  };

  const handleBind = (binding: HaBinding) => {
    handleBindingsChange(addHaBinding(selectionBindings, binding));
    setBindingDialogOpen(false);
  };

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TopToolbar
        hasModel={Boolean(tree)}
        isLoading={isLoading}
        previewMode={previewMode}
        previewCameraMode={previewCameraMode}
        leftCollapsed={leftCollapsed}
        rightCollapsed={rightCollapsed}
        viewMode={viewMode}
        historyState={historyState}
        haStatus={ha.status}
        haStatusMessage={ha.statusMessage}
        weather={weather}
        weatherStatus={weatherStatus}
        fullscreen={fullscreen}
        onUploadClick={handleUploadClick}
        onImportConfigClick={handleImportConfigClick}
        onExport={() => setExportDialogOpen(true)}
        onTogglePreview={() => setPreviewMode((value) => !value)}
        onPreviewCameraModeChange={setPreviewCameraMode}
        onToggleFullscreen={() => void toggleFullscreen()}
        onRetryHaConnection={ha.retryConnection}
        onUndo={() => {
          if (editor?.undo()) {
            refreshTree();
          }
        }}
        onRedo={() => {
          if (editor?.redo()) {
            refreshTree();
          }
        }}
        onViewModeChange={(mode) => {
          setViewMode(mode);
          editor?.setViewMode(mode);
        }}
        onWeatherChange={setWeather}
        onToggleLeft={() => setLeftCollapsed((value) => !value)}
        onToggleRight={() => setRightCollapsed((value) => !value)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf,.obj,model/gltf-binary,model/gltf+json"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={configInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleConfigFileChange}
      />
      <input
        ref={libraryFileInputRef}
        type="file"
        accept=".glb,.gltf,.obj,model/gltf-binary,model/gltf+json"
        className="hidden"
        onChange={handleLibraryFileChange}
      />
      <div className="flex min-h-0 flex-1">
        <div
          aria-hidden={leftCollapsed || previewMode}
          className={cn(
            "flex min-h-0 shrink-0 overflow-hidden transition-[width,opacity,transform] duration-300 ease-out motion-reduce:transition-none",
            leftCollapsed || previewMode
              ? "w-0 -translate-x-3 opacity-0 pointer-events-none"
              : "w-[300px] translate-x-0 opacity-100",
          )}
        >
          <PartsTree
            tree={tree}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onUploadClick={handleUploadClick}
            onAddLocalModelClick={handleLibraryUploadClick}
            onLoadSample={handleLoadSample}
            modelLibraryItems={modelLibraryItems}
            onAddLibraryModel={handleAddLibraryModel}
            onBeginModelDrag={handleBeginModelDrag}
          />
        </div>
        <Viewport
          performance={performanceConfig}
          onReady={setEditor}
          onSelectionChange={setSelectedIds}
          onModelChange={() => setModelVersion((version) => version + 1)}
          onHistoryChange={setHistoryState}
          onLoadProgress={() => undefined}
          onObjectContextMenu={(event) =>
            setObjectMenu({ x: event.clientX, y: event.clientY, uuid: event.uuid })
          }
          canDropModel={canDropLibraryModel}
          onModelDrop={(dataTransfer, point) =>
            void handleViewportDrop(dataTransfer, point)
          }
          isLoading={isLoading}
          error={error}
          viewMode={viewMode}
          previewMode={previewMode}
        />
        {objectMenu && !previewMode ? (
          <div
            className="fixed z-40 grid min-w-[120px] gap-1 rounded-md border border-border bg-popover p-1 text-sm text-popover-foreground shadow-xl"
            style={{
              left: Math.min(objectMenu.x, window.innerWidth - 132),
              top: Math.min(objectMenu.y, window.innerHeight - 92),
            }}
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
          >
            <button
              type="button"
              className="rounded-sm px-2 py-1.5 text-left hover:bg-accent hover:text-accent-foreground"
              onClick={handleDuplicateSelected}
            >
              复制
            </button>
            <button
              type="button"
              className="rounded-sm px-2 py-1.5 text-left text-destructive hover:bg-destructive/10"
              onClick={handleDeleteSelected}
            >
              删除
            </button>
          </div>
        ) : null}
        <div
          aria-hidden={rightCollapsed || previewMode}
          className={cn(
            "flex min-h-0 shrink-0 overflow-hidden transition-[width,opacity,transform] duration-300 ease-out motion-reduce:transition-none",
            rightCollapsed || previewMode
              ? "w-0 translate-x-3 opacity-0 pointer-events-none"
              : "w-[340px] translate-x-0 opacity-100",
          )}
        >
          <RightInspector
            environment={environment}
            performance={performanceConfig}
            haConfig={haConfig}
            haStatus={ha.status}
            haStatusMessage={ha.statusMessage}
            metadata={metadata}
            selectionTransform={selectionTransform}
            selectionBindings={selectionBindings}
            selectedCount={selectedIds.length}
            onEnvironmentChange={handleEnvironmentChange}
            onPerformanceChange={setPerformanceConfig}
            onHaConfigChange={setHaConfig}
            onRetryHaConnection={ha.retryConnection}
            onPositionChange={handlePositionChange}
            onScaleChange={handleScaleChange}
            onSizeChange={handleSizeChange}
            onCenterChange={handleCenterChange}
            onUniformScale={handleUniformScale}
            onOpenBindingDialog={() => setBindingDialogOpen(true)}
            onBindingsChange={handleBindingsChange}
            onCoverCapabilityChange={handleCoverCapabilityChange}
            onLightCapabilityChange={handleLightCapabilityChange}
            onManualDeviceTypeChange={handleManualDeviceTypeChange}
            haStates={ha.states}
            onGroupSelected={handleGroupSelected}
            onDeleteSelected={handleDeleteSelected}
          />
        </div>
        {!previewMode ? (
          <HaBindingDialog
            open={bindingDialogOpen}
            devices={ha.devices}
            states={ha.states}
            deviceEntities={ha.deviceEntities}
            onClose={() => setBindingDialogOpen(false)}
            onRefresh={() => void ha.refresh()}
            onLoadDeviceEntities={ha.loadDeviceEntities}
            onBind={handleBind}
          />
        ) : null}
        {floatingPanelData.map((panel) => (
          <HaFloatingPanel
            key={panel.id}
            anchor={floatingAnchors[panel.id] ?? null}
            bindings={panel.bindings}
            coverCapability={panel.coverCapability}
            lightCapability={panel.lightCapability}
            states={ha.states}
            onCall={(entityId, service, serviceData) =>
              void ha.callEntity(entityId, service, serviceData)
            }
            onClose={() =>
              setFloatingPanels((panels) => closeHaFloatingPanel(panels, panel.id))
            }
          />
        ))}
        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogContent className="max-w-[360px]">
            <DialogHeader>
              <DialogTitle>导出选项</DialogTitle>
              <DialogDescription>选择要导出的模型或配置数据。</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Button
                type="button"
                className="justify-start"
                disabled={exportingMode !== null}
                onClick={() => void handleExportModel(true)}
              >
                {exportingMode === "compressed" ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : null}
                导出压缩后的模型
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="justify-start"
                disabled={exportingMode !== null}
                onClick={() => void handleExportModel(false)}
              >
                {exportingMode === "default" ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : null}
                导出默认大小模型
              </Button>
              <Button
                type="button"
                variant="outline"
                className="justify-start"
                disabled={exportingMode !== null}
                onClick={handleExportConfig}
              >
                导出设置数据
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
