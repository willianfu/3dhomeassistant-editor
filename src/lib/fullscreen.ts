export function isFullscreen(doc: Document = document) {
  return Boolean(doc.fullscreenElement);
}

export async function toggleFullscreen(
  target: HTMLElement = document.documentElement,
  doc: Document = document,
) {
  if (isFullscreen(doc)) {
    await doc.exitFullscreen();
    return;
  }
  await target.requestFullscreen();
}
