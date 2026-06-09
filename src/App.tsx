import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PartsTree } from "./components/editor/PartsTree";
import { RightInspector } from "./components/editor/RightInspector";
import { HaBindingDialog } from "./components/editor/HaBindingDialog";
import { HaFloatingPanel } from "./components/editor/HaFloatingPanel";
import { TopToolbar } from "./components/editor/TopToolbar";
import { Viewport } from "./components/editor/Viewport";
import { useHomeAssistant } from "./hooks/useHomeAssistant";
import { addHaBinding, getBoundEntityIds } from "./lib/ha-bindings";
import {
  buildModelTree,
  getObjectMetadata,
  getSelectionTransformInfo,
  shouldHandleDeleteKey,
} from "./lib/model-tree";
import type { EditorHistoryState } from "./lib/editor-history";
import type { ThreeEditor } from "./lib/three-editor";
import type { HaBinding } from "./types/ha";
import type {
  EnvironmentConfig,
  ModelTreeNode,
  ObjectMetadata,
  SelectionTransformInfo,
  ViewMode,
  Vector3Values,
} from "./types/editor";
import { defaultEnvironment } from "./types/editor";

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
  return /\.(glb|gltf)$/i.test(file.name);
}

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
  const [editor, setEditor] = useState<ThreeEditor | null>(null);
  const [tree, setTree] = useState<ModelTreeNode | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
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
  const [floatingPanelClosed, setFloatingPanelClosed] = useState(false);
  const [floatingAnchor, setFloatingAnchor] = useState<{ x: number; y: number } | null>(null);
  const ha = useHomeAssistant();
  const [environment, setEnvironment] =
    useState<EnvironmentConfig>(defaultEnvironment);

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

  useEffect(() => {
    setFloatingPanelClosed(false);
  }, [selectedIds.join("|")]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setFloatingAnchor(editor?.getSelectionScreenAnchor() ?? null);
    }, 120);
    return () => window.clearInterval(interval);
  }, [editor, selectedIds, modelVersion, viewMode]);

  useEffect(() => {
    editor?.setEnvironment(environment);
  }, [editor, environment]);

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
    editor?.applyHaStates(ha.states);
  }, [editor, ha.states, modelVersion]);

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

  const handleUploadClick = () => {
    fileInputRef.current?.click();
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
      setError("仅支持上传 .glb 或 .gltf 模型文件。");
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const root = await editor.loadModel(file);
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

  const handleExport = async () => {
    if (!editor) {
      return;
    }
    try {
      const blob = await editor.exportGlb();
      downloadBlob(blob, "smart-home-model.glb");
      editor.markSaved();
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "导出失败。");
    }
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

  const handleUniformScale = (multiplier: number) => {
    editor?.scaleSelectionUniform(multiplier);
    refreshTree();
  };

  const handleDeleteSelected = () => {
    if (editor?.deleteSelected()) {
      refreshTree();
    }
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

  const handleBind = (binding: HaBinding) => {
    handleBindingsChange(addHaBinding(selectionBindings, binding));
    setBindingDialogOpen(false);
  };

  const hasFloatingBindings =
    !floatingPanelClosed &&
    getBoundEntityIds(selectionBindings).length > 0;

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TopToolbar
        hasModel={Boolean(tree)}
        isLoading={isLoading}
        previewMode={previewMode}
        leftCollapsed={leftCollapsed}
        rightCollapsed={rightCollapsed}
        viewMode={viewMode}
        historyState={historyState}
        haStatus={ha.status}
        haStatusMessage={ha.statusMessage}
        onUploadClick={handleUploadClick}
        onExport={handleExport}
        onTogglePreview={() => setPreviewMode((value) => !value)}
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
        onToggleLeft={() => setLeftCollapsed((value) => !value)}
        onToggleRight={() => setRightCollapsed((value) => !value)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="flex min-h-0 flex-1">
        {!leftCollapsed && !previewMode ? (
          <PartsTree
            tree={tree}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onUploadClick={handleUploadClick}
            onLoadSample={handleLoadSample}
          />
        ) : null}
        <Viewport
          onReady={setEditor}
          onSelectionChange={setSelectedIds}
          onModelChange={() => setModelVersion((version) => version + 1)}
          onHistoryChange={setHistoryState}
          onLoadProgress={() => undefined}
          isLoading={isLoading}
          error={error}
          viewMode={viewMode}
          previewMode={previewMode}
        />
        {!rightCollapsed && !previewMode ? (
          <RightInspector
            environment={environment}
            metadata={metadata}
            selectionTransform={selectionTransform}
            selectionBindings={selectionBindings}
            selectedCount={selectedIds.length}
            onEnvironmentChange={handleEnvironmentChange}
            onPositionChange={handlePositionChange}
            onScaleChange={handleScaleChange}
            onSizeChange={handleSizeChange}
            onUniformScale={handleUniformScale}
            onOpenBindingDialog={() => setBindingDialogOpen(true)}
            onBindingsChange={handleBindingsChange}
            haStates={ha.states}
            onGroupSelected={handleGroupSelected}
            onDeleteSelected={handleDeleteSelected}
          />
        ) : null}
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
        {hasFloatingBindings ? (
          <HaFloatingPanel
            anchor={floatingAnchor}
            bindings={selectionBindings}
            states={ha.states}
            onCall={(entityId, service, serviceData) =>
              void ha.callEntity(entityId, service, serviceData)
            }
            onClose={() => setFloatingPanelClosed(true)}
          />
        ) : null}
      </div>
    </main>
  );
}
