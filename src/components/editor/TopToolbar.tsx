import {
  Download,
  Eye,
  EyeOff,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  SquareDashedMousePointer,
  Undo2,
  Upload,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { EditorHistoryState } from "../../lib/editor-history";
import type { HaConnectionStatus } from "../../types/ha";
import type { ViewMode } from "../../types/editor";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

type TopToolbarProps = {
  hasModel: boolean;
  isLoading: boolean;
  previewMode: boolean;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  viewMode: ViewMode;
  historyState: EditorHistoryState;
  haStatus: HaConnectionStatus;
  haStatusMessage: string;
  onUploadClick: () => void;
  onExport: () => void;
  onTogglePreview: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onToggleLeft: () => void;
  onToggleRight: () => void;
};

function IconButton({
  label,
  children,
  onClick,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          aria-label={label}
          disabled={disabled}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function HaStatus({
  status,
  message,
}: {
  status: HaConnectionStatus;
  message: string;
}) {
  const label =
    status === "connected"
      ? "已连接"
      : status === "not_configured"
        ? "未配置"
        : "未连接";

  return (
    <div
      className="flex h-8 items-center gap-1 rounded-md border border-border bg-background/60 px-2 text-xs text-muted-foreground"
      title={message || status}
    >
      {status === "connected" ? <Wifi size={14} /> : <WifiOff size={14} />}
      HA {label}
    </div>
  );
}

export function TopToolbar({
  hasModel,
  isLoading,
  previewMode,
  leftCollapsed,
  rightCollapsed,
  viewMode,
  historyState,
  haStatus,
  haStatusMessage,
  onUploadClick,
  onExport,
  onTogglePreview,
  onUndo,
  onRedo,
  onViewModeChange,
  onToggleLeft,
  onToggleRight,
}: TopToolbarProps) {
  return (
    <TooltipProvider delayDuration={120}>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-panel/95 px-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          {!previewMode ? (
            <IconButton
              label={leftCollapsed ? "展开零件库" : "折叠零件库"}
              onClick={onToggleLeft}
            >
              {leftCollapsed ? (
                <PanelLeftOpen size={17} />
              ) : (
                <PanelLeftClose size={17} />
              )}
            </IconButton>
          ) : null}
          <div className="min-w-0 px-2">
            <div className="truncate text-sm font-semibold tracking-normal text-foreground">
              3D 智能家居主控设计器
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {previewMode ? "预览模式" : "GLB / GLTF 模型编辑"}
              {historyState.isDirty && !previewMode ? " · 未导出" : ""}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <HaStatus status={haStatus} message={haStatusMessage} />
          {previewMode ? (
            <Button
              variant="default"
              size="sm"
              onClick={onTogglePreview}
              disabled={!hasModel}
            >
              <EyeOff size={15} />
              返回编辑
            </Button>
          ) : (
            <>
              <div className="flex h-8 items-center rounded-md border border-border bg-background/60 p-0.5">
                <IconButton
                  label="撤销 Ctrl+Z"
                  onClick={onUndo}
                  disabled={!historyState.canUndo}
                >
                  <Undo2 size={15} />
                </IconButton>
                <IconButton
                  label="重做 Ctrl+Y"
                  onClick={onRedo}
                  disabled={!historyState.canRedo}
                >
                  <Redo2 size={15} />
                </IconButton>
              </div>
              <div className="flex h-8 items-center rounded-md border border-border bg-background/60 p-0.5">
                {([
                  ["perspective", "透视"],
                  ["top", "顶视"],
                  ["front", "正视"],
                  ["side", "侧视"],
                ] as const).map(([mode, label]) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onViewModeChange(mode)}
                    disabled={!hasModel && mode !== "perspective"}
                  >
                    {mode !== "perspective" ? (
                      <SquareDashedMousePointer size={13} />
                    ) : null}
                    {label}
                  </Button>
                ))}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={onUploadClick}
                disabled={isLoading}
              >
                <Upload size={15} />
                上传
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onTogglePreview}
                disabled={!hasModel}
              >
                <Eye size={15} />
                预览
              </Button>
              <Button size="sm" onClick={onExport} disabled={!hasModel || isLoading}>
                <Download size={15} />
                导出
              </Button>
              <IconButton
                label={rightCollapsed ? "展开配置栏" : "折叠配置栏"}
                onClick={onToggleRight}
              >
                {rightCollapsed ? (
                  <PanelRightOpen size={17} />
                ) : (
                  <PanelRightClose size={17} />
                )}
              </IconButton>
            </>
          )}
        </div>
      </header>
    </TooltipProvider>
  );
}
