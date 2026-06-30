import { useEffect, useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import type { EditorHistoryState } from "../../lib/editor-history";
import type { FirstPersonDirection } from "../../lib/first-person-controls";
import { ThreeEditor } from "../../lib/three-editor";
import { cn } from "../../lib/utils";
import type { AppearanceTheme } from "../../types/appearance";
import type {
  PerformanceConfig,
  PreviewCameraMode,
  ViewMode,
} from "../../types/editor";
import { Button } from "../ui/button";

type RenderStats = {
  calls: number;
  triangles: number;
  points: number;
  lines: number;
};

type ViewportProps = {
  performance: PerformanceConfig;
  onReady: (editor: ThreeEditor | null) => void;
  onSelectionChange: (uuids: string[]) => void;
  onModelChange: () => void;
  onHistoryChange: (state: EditorHistoryState) => void;
  onLoadProgress: (progress: number) => void;
  onObjectContextMenu: (event: { clientX: number; clientY: number; uuid: string }) => void;
  onRegionDraftChange: (pointCount: number) => void;
  canDropModel: (dataTransfer: DataTransfer) => boolean;
  onModelDrop: (
    dataTransfer: DataTransfer,
    point: { clientX: number; clientY: number },
  ) => void;
  isLoading: boolean;
  error: string | null;
  viewMode: ViewMode;
  previewMode: boolean;
  previewCameraMode: PreviewCameraMode;
  appearanceTheme: AppearanceTheme;
  children?: ReactNode;
};

function FirstPersonMoveButton({
  direction,
  label,
  className,
  children,
  onMove,
}: {
  direction: FirstPersonDirection;
  label: string;
  className?: string;
  children: ReactNode;
  onMove: (direction: FirstPersonDirection, active: boolean) => void;
}) {
  const setActive = (active: boolean) => (event: PointerEvent) => {
    event.preventDefault();
    onMove(direction, active);
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      aria-label={label}
      className={cn("size-11 touch-none rounded-md bg-panel/85 shadow-xl backdrop-blur", className)}
      onPointerDown={setActive(true)}
      onPointerUp={setActive(false)}
      onPointerCancel={setActive(false)}
      onPointerLeave={setActive(false)}
      onContextMenu={(event) => event.preventDefault()}
    >
      {children}
    </Button>
  );
}

export function Viewport({
  performance,
  onReady,
  onSelectionChange,
  onModelChange,
  onHistoryChange,
  onLoadProgress,
  onObjectContextMenu,
  onRegionDraftChange,
  canDropModel,
  onModelDrop,
  isLoading,
  error,
  viewMode,
  previewMode,
  previewCameraMode,
  appearanceTheme,
  children,
}: ViewportProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const initialRenderBackendRef = useRef(performance.renderBackend);
  const callbacksRef = useRef({
    onSelectionChange,
    onModelChange,
    onHistoryChange,
    onLoadProgress,
    onObjectContextMenu,
    onRegionDraftChange,
  });
  const editorRef = useRef<ThreeEditor | null>(null);
  const [fps, setFps] = useState<number | null>(null);
  const [renderStats, setRenderStats] = useState<RenderStats | null>(null);

  useEffect(() => {
    callbacksRef.current = {
      onSelectionChange,
      onModelChange,
      onHistoryChange,
      onLoadProgress,
      onObjectContextMenu,
      onRegionDraftChange,
    };
  }, [
    onHistoryChange,
    onLoadProgress,
    onModelChange,
    onObjectContextMenu,
    onRegionDraftChange,
    onSelectionChange,
  ]);

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }
    const editor = new ThreeEditor(hostRef.current, {
      renderBackend: initialRenderBackendRef.current,
      quality: performance.quality,
      realisticRenderingEnabled: performance.realisticRenderingEnabled,
      onSelectionChange: (uuid) => callbacksRef.current.onSelectionChange(uuid),
      onModelChange: () => callbacksRef.current.onModelChange(),
      onHistoryChange: (state) => callbacksRef.current.onHistoryChange(state),
      onLoadProgress: (progress) => callbacksRef.current.onLoadProgress(progress),
      onObjectContextMenu: (event) => callbacksRef.current.onObjectContextMenu(event),
      onRegionDraftChange: (pointCount) =>
        callbacksRef.current.onRegionDraftChange(pointCount),
      onFpsChange: (nextFps, stats) => {
        setFps(nextFps);
        setRenderStats(stats ?? null);
      },
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

  useEffect(() => {
    editorRef.current?.setAppearanceTheme(appearanceTheme);
  }, [appearanceTheme]);

  const handleFirstPersonMove = (
    direction: FirstPersonDirection,
    active: boolean,
  ) => {
    editorRef.current?.setFirstPersonMoveDirection(direction, active);
  };

  return (
    <section className="relative min-w-0 flex-1 overflow-hidden bg-background">
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
      {children}
      {previewMode && previewCameraMode === "firstPerson" ? (
        <div className="pointer-events-auto absolute bottom-8 left-4 grid grid-cols-3 gap-1.5 lg:hidden">
          <FirstPersonMoveButton
            direction="forward"
            label="向前移动"
            className="col-start-2"
            onMove={handleFirstPersonMove}
          >
            <ArrowUp />
          </FirstPersonMoveButton>
          <FirstPersonMoveButton
            direction="left"
            label="向左移动"
            className="col-start-1 row-start-2"
            onMove={handleFirstPersonMove}
          >
            <ArrowLeft />
          </FirstPersonMoveButton>
          <FirstPersonMoveButton
            direction="backward"
            label="向后移动"
            className="col-start-2 row-start-2"
            onMove={handleFirstPersonMove}
          >
            <ArrowDown />
          </FirstPersonMoveButton>
          <FirstPersonMoveButton
            direction="right"
            label="向右移动"
            className="col-start-3 row-start-2"
            onMove={handleFirstPersonMove}
          >
            <ArrowRight />
          </FirstPersonMoveButton>
        </div>
      ) : null}
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
          {renderStats
            ? ` · ${renderStats.calls} calls · ${Math.round(renderStats.triangles / 1000)}k tris`
            : ""}
        </div>
      ) : null}
    </section>
  );
}
