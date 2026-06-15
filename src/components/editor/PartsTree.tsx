import { Cuboid, Folder, GripVertical, Upload } from "lucide-react";
import type { DragEvent } from "react";
import { useMemo, useRef, useState } from "react";
import { flattenModelTree } from "../../lib/model-tree";
import { cn } from "../../lib/utils";
import { getVirtualRange } from "../../lib/virtual-list";
import type { ModelTreeNode } from "../../types/editor";
import type { ModelLibraryItem } from "../../lib/model-library";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
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
    <Card
      className="group overflow-hidden"
      draggable
      onDragStart={(event) => onDragStart(event, item)}
    >
      <div className="aspect-[4/3] border-b border-border bg-secondary/35">
        <img
          src={item.thumbnailUrl}
          alt={item.name}
          className="h-full w-full object-cover"
          draggable={false}
        />
      </div>
      <CardHeader className="gap-2 p-3">
        <CardTitle className="truncate text-sm">{item.name}</CardTitle>
        <CardDescription className="flex items-center gap-2">
          <Badge variant="secondary">{item.category}</Badge>
          <Badge variant="outline">{item.format.toUpperCase()}</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2 px-3 pb-3 pt-0">
        <Button size="sm" variant="secondary" onClick={() => onAdd(item)}>
          <Cuboid data-icon="inline-start" />
          添加
        </Button>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <GripVertical />
          拖拽
        </div>
      </CardContent>
    </Card>
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
          <div className="flex h-full min-h-0 flex-col gap-3 p-3">
            <Button variant="secondary" className="w-full" onClick={onAddLocalModelClick}>
              <Upload data-icon="inline-start" />
              添加本地模型
            </Button>
            <ScrollArea className="min-h-0 flex-1 pr-2">
              <div className="grid gap-3">
                {modelLibraryItems.map((item) => (
                  <ModelLibraryTile
                    key={item.id}
                    item={item}
                    onAdd={onAddLibraryModel}
                    onDragStart={onBeginModelDrag}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
