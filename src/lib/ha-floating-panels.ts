export type HaFloatingPanelState = {
  id: string;
  objectIds: string[];
};

function panelId(objectIds: string[]) {
  return objectIds.join("|");
}

export function openHaFloatingPanel(
  panels: HaFloatingPanelState[],
  objectIds: string[],
) {
  if (objectIds.length === 0) {
    return panels;
  }
  const nextPanel = {
    id: panelId(objectIds),
    objectIds,
  };
  const exists = panels.some((panel) => panel.id === nextPanel.id);
  return exists ? panels : [...panels, nextPanel];
}

export function closeHaFloatingPanel(
  panels: HaFloatingPanelState[],
  panelIdToClose: string,
) {
  return panels.filter((panel) => panel.id !== panelIdToClose);
}

export function removeMissingHaFloatingPanels(
  panels: HaFloatingPanelState[],
  existingObjectIds: Set<string>,
) {
  const nextPanels = panels.filter((panel) =>
    panel.objectIds.every((objectId) => existingObjectIds.has(objectId)),
  );
  return nextPanels.length === panels.length ? panels : nextPanels;
}

export function shouldUpdateFloatingPanelAnchors({
  now,
  lastUpdateTime,
  intervalMs,
  force = false,
}: {
  now: number;
  lastUpdateTime: number;
  intervalMs: number;
  force?: boolean;
}) {
  return force || lastUpdateTime === 0 || now - lastUpdateTime >= intervalMs;
}
