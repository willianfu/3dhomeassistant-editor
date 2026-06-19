import {
  Cloud,
  CloudRain,
  Download,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  CloudSun,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  SquareDashedMousePointer,
  Sun,
  Undo2,
  Upload,
  Wind,
  Zap,
} from "lucide-react";
import type { EditorHistoryState } from "../../lib/editor-history";
import { canRetryHaConnection } from "../../lib/ha-status";
import { cn } from "../../lib/utils";
import {
  WEATHER_OPTIONS,
  type WeatherConfig,
  type WeatherMode,
} from "../../lib/weather-presets";
import type { HaConnectionStatus } from "../../types/ha";
import type { PreviewCameraMode, ViewMode } from "../../types/editor";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
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
  previewCameraMode: PreviewCameraMode;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  viewMode: ViewMode;
  historyState: EditorHistoryState;
  haStatus: HaConnectionStatus;
  haStatusMessage: string;
  weather: WeatherConfig;
  weatherStatus?: string | null;
  fullscreen: boolean;
  onUploadClick: () => void;
  onExport: () => void;
  onImportConfigClick: () => void;
  onTogglePreview: () => void;
  onPreviewCameraModeChange: (mode: PreviewCameraMode) => void;
  onToggleFullscreen: () => void;
  onRetryHaConnection: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onWeatherChange: (weather: WeatherConfig) => void;
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
  onRetry,
}: {
  status: HaConnectionStatus;
  message: string;
  onRetry: () => void;
}) {
  const label =
    status === "connected"
      ? "已连接"
      : status === "not_configured"
        ? "未配置"
        : "未连接";

  const canRetry = canRetryHaConnection(status);

  return (
    <button
      type="button"
      className={cn(
        "flex h-8 shrink-0 items-center gap-2 rounded-md px-2 text-xs text-muted-foreground transition-colors",
        canRetry ? "hover:bg-accent hover:text-accent-foreground" : "cursor-default",
      )}
      title={message || status}
      onClick={() => {
        if (canRetry) {
          onRetry();
        }
      }}
      disabled={!canRetry}
    >
      <span
        className={cn(
          "size-2 rounded-full shadow-[0_0_10px_currentColor]",
          status === "connected"
            ? "bg-emerald-400 text-emerald-400"
            : status === "connecting"
              ? "bg-yellow-400 text-yellow-400"
              : "bg-destructive text-destructive",
        )}
      />
      HA {label}
    </button>
  );
}

function getWeatherIcon(mode: WeatherMode) {
  if (mode === "sunny") {
    return Sun;
  }
  if (mode === "cloudy" || mode === "overcast") {
    return Cloud;
  }
  if (mode.startsWith("rain")) {
    return CloudRain;
  }
  if (mode === "wind") {
    return Wind;
  }
  if (mode === "lightning") {
    return Zap;
  }
  return CloudSun;
}

function WeatherMenu({
  weather,
  weatherStatus,
  onChange,
}: {
  weather: WeatherConfig;
  weatherStatus?: string | null;
  onChange: (weather: WeatherConfig) => void;
}) {
  const current = WEATHER_OPTIONS.find((option) => option.mode === weather.mode) ?? WEATHER_OPTIONS[0];
  const CurrentIcon = getWeatherIcon(current.mode);
  const openBaiduPicker = () => {
    window.open("https://api.map.baidu.com/lbsapi/getpoint/", "_blank", "noopener,noreferrer");
  };

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="天气模拟">
              <CurrentIcon />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>天气模拟：{current.label}</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-[300px]">
        <div className="mb-2">
          <div className="text-sm font-medium text-foreground">天气模拟</div>
          <div className="text-[10px] text-muted-foreground">实时天气或手动模拟</div>
        </div>
        <details className="mb-2 rounded-md border border-border bg-background/50 p-2">
          <summary className="cursor-pointer text-xs font-medium text-foreground">
            实时天气配置
          </summary>
          <div className="mt-2 grid gap-2">
            <label className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={weather.realtimeEnabled ?? true}
                onCheckedChange={(checked) =>
                  onChange({ ...weather, realtimeEnabled: checked === true })
                }
              />
              <span>实时天气</span>
            </label>
            <div className="grid grid-cols-[52px_1fr] items-center gap-1.5">
              <Label className="text-xs">Key</Label>
              <Input
                type="password"
                value={weather.qweatherApiKey ?? ""}
                placeholder="和风天气 API Key"
                onChange={(event) =>
                  onChange({ ...weather, qweatherApiKey: event.target.value })
                }
              />
              <Label className="text-xs">位置</Label>
              <div className="flex min-w-0 items-center gap-1">
                <Input
                  value={weather.qweatherLocation ?? ""}
                  placeholder="115.86,28.68"
                  className="min-w-0"
                  onChange={(event) =>
                    onChange({ ...weather, qweatherLocation: event.target.value })
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  aria-label="打开百度地图坐标拾取"
                  onClick={openBaiduPicker}
                >
                  <MapPin data-icon="inline-start" />
                </Button>
              </div>
            </div>
          </div>
          {weatherStatus ? (
            <div className="mt-2 truncate text-[10px] text-muted-foreground" title={weatherStatus}>
              {weatherStatus}
            </div>
          ) : null}
        </details>
        <div className="grid grid-cols-3 gap-1.5">
          {WEATHER_OPTIONS.map((option) => {
            const Icon = getWeatherIcon(option.mode);
            return (
              <Button
                key={option.mode}
                type="button"
                variant={weather.mode === option.mode ? "default" : "outline"}
                className="h-8 justify-start px-1.5 text-xs"
                onClick={() =>
                  onChange({ ...weather, mode: option.mode, realtimeEnabled: false })
                }
              >
                <Icon data-icon="inline-start" />
                <span className="truncate">{option.label}</span>
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TopToolbar({
  hasModel,
  isLoading,
  previewMode,
  previewCameraMode,
  leftCollapsed,
  rightCollapsed,
  viewMode,
  historyState,
  haStatus,
  haStatusMessage,
  weather,
  weatherStatus,
  fullscreen,
  onUploadClick,
  onExport,
  onImportConfigClick,
  onTogglePreview,
  onPreviewCameraModeChange,
  onToggleFullscreen,
  onRetryHaConnection,
  onUndo,
  onRedo,
  onWeatherChange,
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
              {leftCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </IconButton>
          ) : null}
          <div className="min-w-0 px-2">
            <div className="truncate text-sm font-semibold tracking-normal text-foreground">
              3D 智能家居主控设计器
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {previewMode ? "预览模式" : "GLB / GLTF / OBJ 模型编辑"}
              {historyState.isDirty && !previewMode ? " · 未导出" : ""}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <HaStatus
            status={haStatus}
            message={haStatusMessage}
            onRetry={onRetryHaConnection}
          />
          <WeatherMenu
            weather={weather}
            weatherStatus={weatherStatus}
            onChange={onWeatherChange}
          />
          <IconButton
            label={fullscreen ? "退出全屏" : "全屏显示"}
            onClick={onToggleFullscreen}
          >
            {fullscreen ? <Minimize2 /> : <Maximize2 />}
          </IconButton>
          {previewMode ? (
            <>
              <div className="flex h-8 items-center rounded-md border border-border bg-background/60 p-0.5">
                {([
                  ["manual", "手动视角"],
                  ["auto", "自动视角"],
                ] as const).map(([mode, label]) => (
                  <Button
                    key={mode}
                    variant={previewCameraMode === mode ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onPreviewCameraModeChange(mode)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={onTogglePreview}
                disabled={!hasModel}
              >
                <EyeOff data-icon="inline-start" />
                返回编辑
              </Button>
            </>
          ) : (
            <>
              <div className="flex h-8 items-center rounded-md border border-border bg-background/60 p-0.5">
                <IconButton
                  label="撤销 Ctrl+Z"
                  onClick={onUndo}
                  disabled={!historyState.canUndo}
                >
                  <Undo2 />
                </IconButton>
                <IconButton
                  label="重做 Ctrl+Y"
                  onClick={onRedo}
                  disabled={!historyState.canRedo}
                >
                  <Redo2 />
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
                      <SquareDashedMousePointer data-icon="inline-start" />
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
                <Upload data-icon="inline-start" />
                上传
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onImportConfigClick}
                disabled={isLoading}
              >
                <Upload data-icon="inline-start" />
                配置
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onTogglePreview}
                disabled={!hasModel}
              >
                <Eye data-icon="inline-start" />
                预览
              </Button>
              <Button size="sm" onClick={onExport} disabled={!hasModel || isLoading}>
                <Download data-icon="inline-start" />
                导出
              </Button>
              <IconButton
                label={rightCollapsed ? "展开配置栏" : "折叠配置栏"}
                onClick={onToggleRight}
              >
                {rightCollapsed ? <PanelRightOpen /> : <PanelRightClose />}
              </IconButton>
            </>
          )}
        </div>
      </header>
    </TooltipProvider>
  );
}
