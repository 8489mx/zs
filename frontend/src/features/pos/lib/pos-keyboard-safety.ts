export function isInteractiveElement(element: EventTarget | Element | null | undefined): boolean {
  if (!(element instanceof Element)) return false;
  const interactiveTarget = element.closest(
    'input, textarea, select, button, [contenteditable="true"], [role="combobox"], [role="listbox"], [role="menu"], [data-pos-interactive="true"]',
  );
  return Boolean(interactiveTarget);
}

export function isPosModalOpen(doc: Document = document): boolean {
  return Boolean(doc.querySelector('[role="dialog"][aria-modal="true"], .dialog-overlay'));
}
