import {
  Download,
  Eye,
  EyeOff,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  SquareDashedMousePointer,
  Upload,
} from "lucide-react";
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
  onUploadClick: () => void;
  onExport: () => void;
  onTogglePreview: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onToggleLeft: () => void;
  onToggleRight: () => void;
};

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={onClick} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function TopToolbar({
  hasModel,
  isLoading,
  previewMode,
  leftCollapsed,
  rightCollapsed,
  viewMode,
  onUploadClick,
  onExport,
  onTogglePreview,
  onViewModeChange,
  onToggleLeft,
  onToggleRight,
}: TopToolbarProps) {
  return (
    <TooltipProvider delayDuration={120}>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-panel/95 px-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <IconButton label={leftCollapsed ? "展开零件库" : "折叠零件库"} onClick={onToggleLeft}>
            {leftCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </IconButton>
          <div className="min-w-0 px-2">
            <div className="truncate text-sm font-semibold tracking-normal text-foreground">
              3D 智能家居主控设计器
            </div>
            <div className="truncate text-xs text-muted-foreground">
              GLB / GLTF 模型编辑
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
          <Button variant="secondary" size="sm" onClick={onUploadClick} disabled={isLoading}>
            <Upload size={15} />
            上传
          </Button>
          <Button
            variant={previewMode ? "default" : "secondary"}
            size="sm"
            onClick={onTogglePreview}
            disabled={!hasModel}
          >
            {previewMode ? <EyeOff size={15} /> : <Eye size={15} />}
            {previewMode ? "返回编辑" : "预览"}
          </Button>
          <Button size="sm" onClick={onExport} disabled={!hasModel || isLoading}>
            <Download size={15} />
            导出
          </Button>
          <IconButton label={rightCollapsed ? "展开配置栏" : "折叠配置栏"} onClick={onToggleRight}>
            {rightCollapsed ? <PanelRightOpen size={17} /> : <PanelRightClose size={17} />}
          </IconButton>
        </div>
      </header>
    </TooltipProvider>
  );
}
