export function removeOwnedElement(container: HTMLElement, element: Element | null) {
  if (element && element.parentElement === container) {
    element.remove();
  }
}
