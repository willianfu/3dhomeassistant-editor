import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PartsTree } from "./components/editor/PartsTree";
import { RightInspector } from "./components/editor/RightInspector";
import { TopToolbar } from "./components/editor/TopToolbar";
import { Viewport } from "./components/editor/Viewport";
import {
  buildModelTree,
  getObjectMetadata,
  shouldHandleDeleteKey,
} from "./lib/model-tree";
import type { ThreeEditor } from "./lib/three-editor";
import type {
  EnvironmentConfig,
  ModelTreeNode,
  ObjectMetadata,
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
  }, [editor, selectedIds, tree]);

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
    }
  }, [editor, environment, previewMode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
    if (!shouldHandleDeleteKey(event)) {
        return;
      }
      if (editor?.deleteSelected()) {
        refreshTree();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editor, refreshTree]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) {
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

  const handleDeleteSelected = () => {
    if (editor?.deleteSelected()) {
      refreshTree();
    }
  };

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TopToolbar
        hasModel={Boolean(tree)}
        isLoading={isLoading}
        previewMode={previewMode}
        leftCollapsed={leftCollapsed}
        rightCollapsed={rightCollapsed}
        viewMode={viewMode}
        onUploadClick={handleUploadClick}
        onExport={handleExport}
        onTogglePreview={() => setPreviewMode((value) => !value)}
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
          onModelChange={refreshTree}
          onLoadProgress={() => undefined}
          isLoading={isLoading}
          error={error}
          viewMode={viewMode}
        />
        {!rightCollapsed && !previewMode ? (
          <RightInspector
            environment={environment}
            metadata={metadata}
            selectedCount={selectedIds.length}
            onEnvironmentChange={handleEnvironmentChange}
            onPositionChange={handlePositionChange}
            onDeleteSelected={handleDeleteSelected}
          />
        ) : null}
      </div>
    </main>
  );
}
