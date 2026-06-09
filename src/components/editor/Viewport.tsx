import { useEffect, useRef } from "react";
import { ThreeEditor } from "../../lib/three-editor";
import type { ViewMode } from "../../types/editor";

type ViewportProps = {
  onReady: (editor: ThreeEditor | null) => void;
  onSelectionChange: (uuids: string[]) => void;
  onModelChange: () => void;
  onLoadProgress: (progress: number) => void;
  isLoading: boolean;
  error: string | null;
  viewMode: ViewMode;
};

export function Viewport({
  onReady,
  onSelectionChange,
  onModelChange,
  onLoadProgress,
  isLoading,
  error,
  viewMode,
}: ViewportProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const callbacksRef = useRef({
    onSelectionChange,
    onModelChange,
    onLoadProgress,
  });
  const editorRef = useRef<ThreeEditor | null>(null);

  useEffect(() => {
    callbacksRef.current = {
      onSelectionChange,
      onModelChange,
      onLoadProgress,
    };
  }, [onLoadProgress, onModelChange, onSelectionChange]);

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }
    const editor = new ThreeEditor(hostRef.current, {
      onSelectionChange: (uuid) => callbacksRef.current.onSelectionChange(uuid),
      onModelChange: () => callbacksRef.current.onModelChange(),
      onLoadProgress: (progress) => callbacksRef.current.onLoadProgress(progress),
    });
    editor.init();
    editorRef.current = editor;
    if (import.meta.env.DEV) {
      (window as Window & { __threeEditor?: ThreeEditor }).__threeEditor = editor;
    }
    onReady(editor);

    return () => {
      editorRef.current = null;
      if (import.meta.env.DEV) {
        delete (window as Window & { __threeEditor?: ThreeEditor }).__threeEditor;
      }
      editor.dispose();
      onReady(null);
    };
  }, [onReady]);

  useEffect(() => {
    editorRef.current?.setViewMode(viewMode);
  }, [viewMode]);

  return (
    <section className="relative min-w-0 flex-1 overflow-hidden bg-[#0b1017]">
      <div ref={hostRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-border bg-panel/80 px-3 py-2 text-xs text-muted-foreground shadow-xl backdrop-blur">
        {viewMode === "perspective"
          ? "鼠标拖拽旋转 · 滚轮缩放 · 点击选择零件"
          : "三视图模式 · 拖拽框选完全框入的模型 · Delete 批量删除"}
      </div>
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
    </section>
  );
}
