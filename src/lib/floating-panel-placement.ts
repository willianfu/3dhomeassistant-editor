type Point = {
  x: number;
  y: number;
};

type Size = {
  width: number;
  height: number;
};

const PADDING = 12;
const GAP = 56;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function placeFloatingPanel({
  anchor,
  panel,
  viewport,
}: {
  anchor: Point;
  panel: Size;
  viewport: Size;
}) {
  const maxLeft = Math.max(PADDING, viewport.width - panel.width - PADDING);
  const maxTop = Math.max(PADDING, viewport.height - panel.height - PADDING);
  const centeredLeft = anchor.x - panel.width / 2;
  const hasRoomAbove = anchor.y - GAP - panel.height >= PADDING;
  const top = hasRoomAbove ? anchor.y - panel.height - GAP : anchor.y + GAP;

  return {
    left: Math.round(clamp(centeredLeft, PADDING, maxLeft)),
    top: Math.round(clamp(top, PADDING, maxTop)),
    placement: hasRoomAbove ? ("above" as const) : ("below" as const),
  };
}
