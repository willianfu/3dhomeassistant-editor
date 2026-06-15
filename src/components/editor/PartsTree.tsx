import { Cuboid, Folder, Search, Upload } from "lucide-react";
import type { DragEvent, KeyboardEvent } from "react";
import { useMemo, useRef, useState } from "react";
import type { ModelLibraryItem } from "../../lib/model-library";
import { flattenModelTree } from "../../lib/model-tree";
import { cn } from "../../lib/utils";
import { getVirtualRange } from "../../lib/virtual-list";
import type { ModelTreeNode } from "../../types/editor";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const ROW_HEIGHT = 32;
const OVERSCAN = 8;

type PartsTreeProps = {
  tree: ModelTreeNode | null;
  selectedIds: string[];
  modelLibraryItems: ModelLibraryItem[];
  onSelect: (uuid: string) => void;
  onUploadClick: () => void;
  onAddLocalModelClick: () => void;
  onLoadSample: () => void;
  onAddLibraryModel: (item: ModelLibraryItem) => void;
  onBeginModelDrag: (event: DragEvent<HTMLElement>, item: ModelLibraryItem) => void;
  defaultTab?: "parts" | "library";
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
  onSelect,
}: {
  node: ModelTreeNode;
  selected: boolean;
  onSelect: (uuid: string) => void;
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

export function PartsTree({
  tree,
  selectedIds,
  modelLibraryItems,
  onSelect,
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
  const flatNodes = useMemo(() => (tree ? flattenModelTree(tree) : []), [tree]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="parts">零件树</TabsTrigger>
            <TabsTrigger value="library">模型库</TabsTrigger>
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
                      onSelect={onSelect}
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
                      上传 GLB 或 GLTF 后会自动解析模型层级。
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
      </Tabs>
    </aside>
  );
}
