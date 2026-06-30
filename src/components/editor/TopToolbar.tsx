import {
  Cloud,
  CloudRain,
  Download,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Moon,
  CloudSun,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  Sun,
  Undo2,
  Upload,
  Volume2,
  VolumeX,
  Wind,
  Zap,
} from "lucide-react";
import type { AppearanceConfig } from "../../types/appearance";
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

export type TopToolbarProps = {
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
  appearance: AppearanceConfig;
  weatherStatus?: string | null;
  weatherSoundEnabled: boolean;
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
  onAppearanceChange: (appearance: AppearanceConfig) => void;
  onWeatherSoundToggle: () => void;
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

function AuthorMenu() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1 text-[11px] underline-offset-4 hover:bg-transparent hover:underline"
        >
          关于作者
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px]">
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-sm font-medium text-foreground">关于作者</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              本软件还在不断开发迭代，或有些许不足，会在日后逐渐完善提供更强的功能和更好的交互体验，也欢迎志同道合的朋友一起交流，微信：willainfu_
            </p>
          </div>
          <img
            src="/images/vx.jpg"
            alt="作者微信二维码"
            className="h-auto w-full rounded-md border border-border object-contain"
          />
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
  appearance,
  weatherStatus,
  weatherSoundEnabled,
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
  onAppearanceChange,
  onWeatherSoundToggle,
  onViewModeChange,
  onToggleLeft,
  onToggleRight,
}: TopToolbarProps) {
  return (
    <TooltipProvider delayDuration={120}>
      <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-panel/95 px-3 py-2 backdrop-blur">
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
            <div className="flex min-w-0 items-center gap-2">
              <div className="truncate text-sm font-semibold tracking-normal text-foreground">
                3d智家中控
              </div>
              <AuthorMenu />
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {previewMode ? "预览模式" : "GLB / GLTF / OBJ 模型编辑"}
              {historyState.isDirty && !previewMode ? " · 未导出" : ""}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
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
            label={appearance.theme === "dark" ? "切换亮色主题" : "切换暗色主题"}
            onClick={() =>
              onAppearanceChange({
                theme: appearance.theme === "dark" ? "light" : "dark",
              })
            }
          >
            {appearance.theme === "dark" ? <Sun /> : <Moon />}
          </IconButton>
          <IconButton
            label={weatherSoundEnabled ? "关闭天气音效" : "开启天气音效"}
            onClick={onWeatherSoundToggle}
          >
            {weatherSoundEnabled ? <Volume2 /> : <VolumeX />}
          </IconButton>
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
                  ["firstPerson", "第一人称"],
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
                ] as const).map(([mode, label]) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => onViewModeChange(mode)}
                    disabled={!hasModel && mode !== "perspective"}
                  >
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
