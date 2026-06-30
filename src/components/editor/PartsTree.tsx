import {
  Cuboid,
  ChevronRight,
  Eye,
  EyeOff,
  Folder,
  Map as MapIcon,
  PencilLine,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { DragEvent, KeyboardEvent } from "react";
import { useMemo, useRef, useState } from "react";
import type { ModelLibraryItem } from "../../lib/model-library";
import { flattenVisibleModelTree } from "../../lib/model-tree";
import { cn } from "../../lib/utils";
import { getVirtualRange } from "../../lib/virtual-list";
import type {
  EditorRegion,
  EditorRegionHighlightMode,
  ModelTreeNode,
} from "../../types/editor";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const ROW_HEIGHT = 32;
const OVERSCAN = 8;

type PartsTreeProps = {
  tree: ModelTreeNode | null;
  selectedIds: string[];
  regions?: EditorRegion[];
  selectedRegionId?: string | null;
  regionDrawing?: boolean;
  regionDraftPointCount?: number;
  modelLibraryItems: ModelLibraryItem[];
  onSelect: (uuid: string) => void;
  onSelectRegion?: (regionId: string) => void;
  onRenameRegion?: (regionId: string, name: string) => void;
  onDeleteRegion?: (regionId: string) => void;
  onToggleRegionVisibility?: (regionId: string, hidden: boolean) => void;
  onRegionHighlightModeChange?: (
    regionId: string,
    highlightMode: EditorRegionHighlightMode,
  ) => void;
  onBeginRegionDraw?: () => void;
  onFinishRegionDraw?: () => void;
  onCancelRegionDraw?: () => void;
  onUploadClick: () => void;
  onAddLocalModelClick: () => void;
  onLoadSample: () => void;
  onAddLibraryModel: (item: ModelLibraryItem) => void;
  onBeginModelDrag: (event: DragEvent<HTMLElement>, item: ModelLibraryItem) => void;
  defaultTab?: "parts" | "library" | "regions";
};

type ModelLibraryGroup = {
  category: string;
  items: ModelLibraryItem[];
};

function groupModelLibraryItems(items: ModelLibraryItem[]): ModelLibraryGroup[] {
  const groups = new Map<string, ModelLibraryItem[]>();
  for (const item of items) {
    groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
  }
  return [...groups.entries()].map(([category, groupItems]) => ({
    category,
    items: groupItems,
  }));
}

function TreeRow({
  node,
  selected,
  expanded,
  onSelect,
  onToggleExpanded,
}: {
  node: ModelTreeNode;
  selected: boolean;
  expanded: boolean;
  onSelect: (uuid: string) => void;
  onToggleExpanded: (uuid: string) => void;
}) {
  const hasChildren = node.children.length > 0;

  return (
    <Button
      type="button"
      variant={selected ? "secondary" : "ghost"}
      size="sm"
      onClick={() => onSelect(node.id)}
      className={cn(
        "h-8 w-full justify-start gap-2 px-2 text-left text-xs",
        selected && "text-primary ring-1 ring-primary/35",
      )}
      style={{ paddingLeft: `${8 + node.depth * 14}px` }}
    >
      {hasChildren ? (
        <span
          role="button"
          tabIndex={-1}
          aria-label={expanded ? "折叠零件层级" : "展开零件层级"}
          onClick={(event) => {
            event.stopPropagation();
            onToggleExpanded(node.id);
          }}
          className="grid size-5 shrink-0 place-items-center rounded-sm hover:bg-secondary"
        >
          <ChevronRight
            className={cn("transition-transform", expanded && "rotate-90")}
          />
        </span>
      ) : (
        <span className="size-5 shrink-0" />
      )}
      {hasChildren ? <Folder data-icon="inline-start" /> : <Cuboid data-icon="inline-start" />}
      <span className="min-w-0 flex-1 truncate">{node.name}</span>
      <Badge variant="secondary" className="shrink-0">
        {node.type}
      </Badge>
    </Button>
  );
}

function ModelLibraryTile({
  item,
  onAdd,
  onDragStart,
}: {
  item: ModelLibraryItem;
  onAdd: (item: ModelLibraryItem) => void;
  onDragStart: (event: DragEvent<HTMLElement>, item: ModelLibraryItem) => void;
}) {
  return (
    <button
      type="button"
      draggable
      aria-label={`添加 ${item.name}`}
      onClick={() => onAdd(item)}
      onDragStart={(event) => onDragStart(event, item)}
      className="group flex min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card text-left text-card-foreground transition-colors hover:border-primary/55 hover:bg-secondary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="aspect-square w-full border-b border-border bg-secondary/35">
        <img
          src={item.thumbnailUrl}
          alt={item.name}
          className="h-full w-full object-cover"
          draggable={false}
        />
      </span>
      <span className="flex min-h-[42px] w-full flex-col justify-center gap-1 px-1.5 py-1">
        <span className="truncate text-[11px] font-medium leading-4">{item.name}</span>
        <span className="text-[10px] uppercase leading-none text-muted-foreground">
          {item.format}
        </span>
      </span>
    </button>
  );
}

function ModelLibraryPanel({
  items,
  onAddLocalModelClick,
  onAddLibraryModel,
  onBeginModelDrag,
}: {
  items: ModelLibraryItem[];
  onAddLocalModelClick: () => void;
  onAddLibraryModel: (item: ModelLibraryItem) => void;
  onBeginModelDrag: (event: DragEvent<HTMLElement>, item: ModelLibraryItem) => void;
}) {
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    if (!normalizedQuery) {
      return items;
    }
    return items.filter((item) => item.name.toLowerCase().includes(normalizedQuery));
  }, [items, normalizedQuery]);
  const groups = useMemo(() => groupModelLibraryItems(filteredItems), [filteredItems]);
  const openCategories = useMemo(
    () => groups.map((group) => group.category),
    [groups],
  );

  const commitSearch = () => {
    setSearchQuery(searchDraft);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitSearch();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2">
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="添加本地模型"
          onClick={onAddLocalModelClick}
        >
          <Upload data-icon="inline-start" />
        </Button>
        <Input
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="搜索模型名称"
          className="min-w-0 flex-1 text-xs"
        />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="搜索模型"
          onClick={commitSearch}
        >
          <Search data-icon="inline-start" />
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1 pr-2">
        {groups.length > 0 ? (
          <Accordion
            type="multiple"
            defaultValue={openCategories}
            className="flex flex-col gap-2"
          >
            {groups.map((group) => (
              <AccordionItem
                key={group.category}
                value={group.category}
                className="rounded-md border border-border px-2"
              >
                <AccordionTrigger className="py-2 text-xs hover:no-underline">
                  <span className="truncate">
                    {group.category} {group.items.length}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <div data-testid="model-library-grid" className="grid grid-cols-4 gap-1.5">
                    {group.items.map((item) => (
                      <ModelLibraryTile
                        key={item.id}
                        item={item}
                        onAdd={onAddLibraryModel}
                        onDragStart={onBeginModelDrag}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <Card>
            <CardContent className="p-3 text-center text-xs text-muted-foreground">
              未找到匹配模型
            </CardContent>
          </Card>
        )}
      </ScrollArea>
    </div>
  );
}

function RegionsPanel({
  regions,
  selectedRegionId,
  drawing,
  draftPointCount,
  onBeginRegionDraw,
  onFinishRegionDraw,
  onCancelRegionDraw,
  onSelectRegion,
  onRenameRegion,
  onDeleteRegion,
  onToggleRegionVisibility,
  onRegionHighlightModeChange,
}: {
  regions: EditorRegion[];
  selectedRegionId: string | null;
  drawing: boolean;
  draftPointCount: number;
  onBeginRegionDraw: () => void;
  onFinishRegionDraw: () => void;
  onCancelRegionDraw: () => void;
  onSelectRegion: (regionId: string) => void;
  onRenameRegion: (regionId: string, name: string) => void;
  onDeleteRegion: (regionId: string) => void;
  onToggleRegionVisibility: (regionId: string, hidden: boolean) => void;
  onRegionHighlightModeChange: (
    regionId: string,
    highlightMode: EditorRegionHighlightMode,
  ) => void;
}) {
  const selectedRegion = regions.find((region) => region.id === selectedRegionId) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2">
      <div className="rounded-md border border-border bg-background/55 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-medium">多边形区域</div>
            <div className="mt-1 text-[10px] leading-4 text-muted-foreground">
              顶视图绘制，闭合后保存为可管理区域。
            </div>
          </div>
          <Button
            type="button"
            size="icon"
            variant={drawing ? "default" : "secondary"}
            aria-label="开始绘制多边形区域"
            onClick={onBeginRegionDraw}
          >
            <PencilLine data-icon="icon" />
          </Button>
        </div>
        {drawing ? (
          <div className="mt-2 grid gap-2 rounded-md border border-primary/25 bg-primary/[0.08] p-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">已记录 {draftPointCount} 个点</span>
              <span className="text-[10px] text-muted-foreground">右键取消</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                disabled={draftPointCount < 3}
                onClick={onFinishRegionDraw}
              >
                完成区域绘制
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onCancelRegionDraw}
              >
                <X data-icon="inline-start" />
                取消区域绘制
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {selectedRegion ? (
        <div className="grid gap-2 rounded-md border border-border bg-secondary/30 p-2.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <label className="text-xs font-medium" htmlFor="region-name-input">
              区域名称
            </label>
            <Badge variant={selectedRegion.hidden ? "outline" : "secondary"} className="h-5 px-1.5 text-[10px]">
              {selectedRegion.hidden ? "已隐藏" : "显示中"}
            </Badge>
          </div>
          <Input
            id="region-name-input"
            aria-label="区域名称"
            value={selectedRegion.name}
            onChange={(event) =>
              onRenameRegion(selectedRegion.id, event.target.value)
            }
          />
          <div className="grid gap-1.5">
            <label className="text-xs font-medium" htmlFor="region-highlight-mode">
              选中效果
            </label>
            <Select
              value={selectedRegion.highlightMode ?? "edges"}
              onValueChange={(value) =>
                onRegionHighlightModeChange(
                  selectedRegion.id,
                  value as EditorRegionHighlightMode,
                )
              }
            >
              <SelectTrigger id="region-highlight-mode" aria-label="选中效果" className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="none">无效果</SelectItem>
                  <SelectItem value="faces">无边高亮</SelectItem>
                  <SelectItem value="edges">带边高亮</SelectItem>
                  <SelectItem value="bottom">底面高亮</SelectItem>
                  <SelectItem value="top">顶面高亮</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              aria-label={
                selectedRegion.hidden
                  ? `显示${selectedRegion.name}区域`
                  : `隐藏${selectedRegion.name}区域`
              }
              onClick={() =>
                onToggleRegionVisibility(selectedRegion.id, !selectedRegion.hidden)
              }
            >
              {selectedRegion.hidden ? (
                <Eye data-icon="inline-start" />
              ) : (
                <EyeOff data-icon="inline-start" />
              )}
              {selectedRegion.hidden ? "显示区域" : "隐藏区域"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label="删除选中区域"
              onClick={() => onDeleteRegion(selectedRegion.id)}
            >
              <Trash2 data-icon="inline-start" />
              删除区域
            </Button>
          </div>
        </div>
      ) : null}

      <ScrollArea className="min-h-0 flex-1 pr-2">
        <div className="grid gap-1.5">
          {regions.length === 0 ? (
            <Card>
              <CardContent className="p-3 text-center text-xs text-muted-foreground">
                暂无区域，点击绘制按钮创建房间或功能区。
              </CardContent>
            </Card>
          ) : (
            regions.map((region) => (
              <div
                key={region.id}
                className={cn(
                  "flex min-w-0 items-center gap-1.5 rounded-md border p-1.5 transition-colors",
                  selectedRegionId === region.id
                    ? "border-primary/45 bg-primary/10"
                    : "border-border bg-background/45 hover:border-primary/30",
                  region.hidden && "opacity-70",
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 min-w-0 flex-1 justify-start gap-2 px-1.5 text-xs hover:bg-transparent"
                  onClick={() => onSelectRegion(region.id)}
                >
                  <MapIcon data-icon="inline-start" />
                  <span className="min-w-0 flex-1 truncate">{region.name}</span>
                  <Badge variant="secondary" className="shrink-0 px-1.5 text-[10px]">
                    {region.points.length} 点
                  </Badge>
                  {region.hidden ? (
                    <Badge variant="outline" className="shrink-0 px-1.5 text-[10px]">
                      已隐藏
                    </Badge>
                  ) : null}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={
                    region.hidden ? `显示${region.name}区域` : `隐藏${region.name}区域`
                  }
                  className="size-8 shrink-0"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleRegionVisibility(region.id, !region.hidden);
                  }}
                >
                  {region.hidden ? <Eye data-icon="icon" /> : <EyeOff data-icon="icon" />}
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function PartsTree({
  tree,
  selectedIds,
  regions = [],
  selectedRegionId = null,
  regionDrawing = false,
  regionDraftPointCount = 0,
  modelLibraryItems,
  onSelect,
  onSelectRegion = () => undefined,
  onRenameRegion = () => undefined,
  onDeleteRegion = () => undefined,
  onToggleRegionVisibility = () => undefined,
  onRegionHighlightModeChange = () => undefined,
  onBeginRegionDraw = () => undefined,
  onFinishRegionDraw = () => undefined,
  onCancelRegionDraw = () => undefined,
  onUploadClick,
  onAddLocalModelClick,
  onLoadSample,
  onAddLibraryModel,
  onBeginModelDrag,
  defaultTab = "parts",
}: PartsTreeProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const flatNodes = useMemo(
    () => (tree ? flattenVisibleModelTree(tree, expandedIds) : []),
    [expandedIds, tree],
  );
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const toggleExpanded = (uuid: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(uuid)) {
        next.delete(uuid);
      } else {
        next.add(uuid);
      }
      return next;
    });
  };
  const virtualRange = getVirtualRange({
    itemCount: flatNodes.length,
    rowHeight: ROW_HEIGHT,
    scrollTop,
    viewportHeight,
    overscan: OVERSCAN,
  });
  const visibleNodes = flatNodes.slice(virtualRange.start, virtualRange.end);

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-r border-border bg-panel">
      <div className="border-b border-border px-4 py-3">
        <div className="text-sm font-semibold">零件库</div>
        <div className="mt-1 text-xs text-muted-foreground">
          现有模型层级 · {flatNodes.length} 项
        </div>
      </div>
      <Tabs defaultValue={defaultTab} className="min-h-0 flex-1">
        <div className="border-b border-border px-3 py-3">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="parts">零件树</TabsTrigger>
            <TabsTrigger value="library">模型库</TabsTrigger>
            <TabsTrigger value="regions">区域</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="parts" className="mt-0 h-[calc(100%-65px)]">
          {tree ? (
            <div
              ref={viewportRef}
              className="editor-scrollbar min-h-0 h-full overflow-auto p-2"
              onScroll={(event) => {
                setScrollTop(event.currentTarget.scrollTop);
                setViewportHeight(event.currentTarget.clientHeight);
              }}
              onPointerEnter={(event) => {
                setViewportHeight(event.currentTarget.clientHeight);
              }}
            >
              <div className="relative" style={{ height: `${virtualRange.totalHeight}px` }}>
                <div
                  className="absolute left-0 right-0 grid gap-0.5"
                  style={{ transform: `translateY(${virtualRange.offsetTop}px)` }}
                >
                  {visibleNodes.map((node) => (
                    <TreeRow
                      key={node.id}
                      node={node}
                      selected={selectedSet.has(node.id)}
                      expanded={expandedIds.has(node.id)}
                      onSelect={onSelect}
                      onToggleExpanded={toggleExpanded}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <Card className="w-full">
                <CardContent className="flex flex-col items-center gap-3 p-4">
                  <div className="grid size-11 place-items-center rounded-md border border-border bg-secondary">
                    <Cuboid className="text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">暂无模型零件</div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">
                      上传 GLB、GLTF 或 OBJ 后会自动解析模型层级。
                    </div>
                  </div>
                  <Button size="sm" onClick={onUploadClick}>
                    <Upload data-icon="inline-start" />
                    上传模型
                  </Button>
                  <Button variant="secondary" size="sm" onClick={onLoadSample}>
                    加载示例
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        <TabsContent value="library" className="mt-0 h-[calc(100%-65px)]">
          <ModelLibraryPanel
            items={modelLibraryItems}
            onAddLocalModelClick={onAddLocalModelClick}
            onAddLibraryModel={onAddLibraryModel}
            onBeginModelDrag={onBeginModelDrag}
          />
        </TabsContent>
        <TabsContent value="regions" className="mt-0 h-[calc(100%-65px)]">
          <RegionsPanel
            regions={regions}
            selectedRegionId={selectedRegionId}
            drawing={regionDrawing}
            draftPointCount={regionDraftPointCount}
            onBeginRegionDraw={onBeginRegionDraw}
            onFinishRegionDraw={onFinishRegionDraw}
            onCancelRegionDraw={onCancelRegionDraw}
            onSelectRegion={onSelectRegion}
            onRenameRegion={onRenameRegion}
            onDeleteRegion={onDeleteRegion}
            onToggleRegionVisibility={onToggleRegionVisibility}
            onRegionHighlightModeChange={onRegionHighlightModeChange}
          />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
