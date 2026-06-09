export type VirtualRangeInput = {
  itemCount: number;
  rowHeight: number;
  scrollTop: number;
  viewportHeight: number;
  overscan: number;
};

export type VirtualRange = {
  start: number;
  end: number;
  offsetTop: number;
  totalHeight: number;
};

export function getVirtualRange({
  itemCount,
  rowHeight,
  scrollTop,
  viewportHeight,
  overscan,
}: VirtualRangeInput): VirtualRange {
  if (itemCount <= 0) {
    return { start: 0, end: 0, offsetTop: 0, totalHeight: 0 };
  }

  const totalHeight = itemCount * rowHeight;
  const maxScrollTop = Math.max(0, totalHeight - viewportHeight);
  const clampedScrollTop = Math.min(Math.max(scrollTop, 0), maxScrollTop);
  const visibleStart = Math.floor(clampedScrollTop / rowHeight);
  const visibleCount = Math.ceil(viewportHeight / rowHeight);
  const start = Math.max(0, visibleStart - overscan);
  const end = Math.min(itemCount, visibleStart + visibleCount + overscan);

  return {
    start,
    end,
    offsetTop: start * rowHeight,
    totalHeight,
  };
}
