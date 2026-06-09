import { Cuboid, Folder, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { flattenModelTree } from "../../lib/model-tree";
import { cn } from "../../lib/utils";
import { getVirtualRange } from "../../lib/virtual-list";
import type { ModelTreeNode } from "../../types/editor";
import { Button } from "../ui/button";

const ROW_HEIGHT = 32;
const OVERSCAN = 8;

type PartsTreeProps = {
  tree: ModelTreeNode | null;
  selectedIds: string[];
  onSelect: (uuid: string) => void;
  onUploadClick: () => void;
  onLoadSample: () => void;
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
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs transition-colors hover:bg-secondary",
        selected && "bg-primary/15 text-primary ring-1 ring-primary/35",
      )}
      style={{ paddingLeft: `${8 + node.depth * 14}px` }}
    >
      {hasChildren ? <Folder size={14} /> : <Cuboid size={14} />}
      <span className="min-w-0 flex-1 truncate">{node.name}</span>
      <span className="shrink-0 text-[10px] text-muted-foreground">
        {node.type}
      </span>
    </button>
  );
}

export function PartsTree({
  tree,
  selectedIds,
  onSelect,
  onUploadClick,
  onLoadSample,
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
          原始模型层级 · {flatNodes.length} 项
        </div>
      </div>
      {tree ? (
        <div
          ref={viewportRef}
          className="min-h-0 flex-1 overflow-auto p-2"
          onScroll={(event) => {
            setScrollTop(event.currentTarget.scrollTop);
            setViewportHeight(event.currentTarget.clientHeight);
          }}
          onPointerEnter={(event) => {
            setViewportHeight(event.currentTarget.clientHeight);
          }}
        >
          <div
            className="relative"
            style={{ height: `${virtualRange.totalHeight}px` }}
          >
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
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="grid h-11 w-11 place-items-center rounded-md border border-border bg-secondary">
            <Cuboid size={20} className="text-muted-foreground" />
          </div>
          <div>
            <div className="text-sm font-medium">暂无模型零件</div>
            <div className="mt-1 text-xs leading-5 text-muted-foreground">
              上传 GLB 或 GLTF 后会自动解析模型层级。
            </div>
          </div>
          <Button size="sm" onClick={onUploadClick}>
            <Upload size={14} />
            上传模型
          </Button>
          <Button variant="secondary" size="sm" onClick={onLoadSample}>
            加载示例
          </Button>
        </div>
      )}
    </aside>
  );
}
