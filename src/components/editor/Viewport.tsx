import { useEffect, useRef, useState } from "react";
import type { EditorHistoryState } from "../../lib/editor-history";
import { ThreeEditor } from "../../lib/three-editor";
import type { PerformanceConfig, ViewMode } from "../../types/editor";

type ViewportProps = {
  performance: PerformanceConfig;
  onReady: (editor: ThreeEditor | null) => void;
  onSelectionChange: (uuids: string[]) => void;
  onModelChange: () => void;
  onHistoryChange: (state: EditorHistoryState) => void;
  onLoadProgress: (progress: number) => void;
  onObjectContextMenu: (event: { clientX: number; clientY: number; uuid: string }) => void;
  canDropModel: (dataTransfer: DataTransfer) => boolean;
  onModelDrop: (
    dataTransfer: DataTransfer,
    point: { clientX: number; clientY: number },
  ) => void;
  isLoading: boolean;
  error: string | null;
  viewMode: ViewMode;
  previewMode: boolean;
};

export function Viewport({
  performance,
  onReady,
  onSelectionChange,
  onModelChange,
  onHistoryChange,
  onLoadProgress,
  onObjectContextMenu,
  canDropModel,
  onModelDrop,
  isLoading,
  error,
  viewMode,
  previewMode,
}: ViewportProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const initialRenderBackendRef = useRef(performance.renderBackend);
  const callbacksRef = useRef({
    onSelectionChange,
    onModelChange,
    onHistoryChange,
    onLoadProgress,
    onObjectContextMenu,
  });
  const editorRef = useRef<ThreeEditor | null>(null);
  const [fps, setFps] = useState<number | null>(null);

  useEffect(() => {
    callbacksRef.current = {
      onSelectionChange,
      onModelChange,
      onHistoryChange,
      onLoadProgress,
      onObjectContextMenu,
    };
  }, [onHistoryChange, onLoadProgress, onModelChange, onObjectContextMenu, onSelectionChange]);

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }
    const editor = new ThreeEditor(hostRef.current, {
      renderBackend: initialRenderBackendRef.current,
      quality: performance.quality,
      onSelectionChange: (uuid) => callbacksRef.current.onSelectionChange(uuid),
      onModelChange: () => callbacksRef.current.onModelChange(),
      onHistoryChange: (state) => callbacksRef.current.onHistoryChange(state),
      onLoadProgress: (progress) => callbacksRef.current.onLoadProgress(progress),
      onObjectContextMenu: (event) => callbacksRef.current.onObjectContextMenu(event),
      onFpsChange: setFps,
    });
    let disposed = false;
    void editor.init().then(() => {
      if (disposed) {
        editor.dispose();
        return;
      }
      editorRef.current = editor;
      if (import.meta.env.DEV) {
        (window as Window & { __threeEditor?: ThreeEditor }).__threeEditor = editor;
      }
      onReady(editor);
    });

    return () => {
      disposed = true;
      editorRef.current = null;
      if (import.meta.env.DEV) {
        delete (window as Window & { __threeEditor?: ThreeEditor }).__threeEditor;
      }
      editor.dispose();
      onReady(null);
    };
  }, [onReady]);

  useEffect(() => {
    editorRef.current?.setPerformanceConfig(performance);
  }, [performance]);

  useEffect(() => {
    editorRef.current?.setViewMode(viewMode);
  }, [viewMode]);

  return (
    <section className="relative min-w-0 flex-1 overflow-hidden bg-[#0b1017]">
      <div
        ref={hostRef}
        className="h-full w-full"
        onDragOver={(event) => {
          if (canDropModel(event.dataTransfer)) {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }
        }}
        onDrop={(event) => {
          if (canDropModel(event.dataTransfer)) {
            event.preventDefault();
            onModelDrop(event.dataTransfer, {
              clientX: event.clientX,
              clientY: event.clientY,
            });
          }
        }}
      />
      {!previewMode ? (
        <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-border bg-panel/80 px-3 py-2 text-xs text-muted-foreground shadow-xl backdrop-blur">
          {viewMode === "perspective"
            ? "点击选择 · Shift 多选 · 拖拽箭头移动 · Ctrl+Z/Y 撤销重做"
            : "三视图模式 · 滚轮缩放 · 右键/中键平移 · 左键框选 · Delete 批量删除"}
        </div>
      ) : null}
      {isLoading ? (
        <div className="absolute inset-0 grid place-items-center bg-background/35 backdrop-blur-sm">
          <div className="rounded-md border border-border bg-panel px-4 py-3 text-sm shadow-xl">
            正在解析模型...
          </div>
        </div>
      ) : null}
      {error ? (
        <div className="absolute bottom-4 left-1/2 max-w-[520px] -translate-x-1/2 rounded-md border border-destructive/60 bg-destructive/15 px-4 py-2 text-sm text-destructive-foreground shadow-xl backdrop-blur">
          {error}
        </div>
      ) : null}
      {fps !== null ? (
        <div className="pointer-events-none absolute bottom-2 left-2 select-none rounded bg-background/25 px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground/55">
          {fps} fps
        </div>
      ) : null}
    </section>
  );
}
