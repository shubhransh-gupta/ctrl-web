/** Hide all CTRL+WEB overlays before capturing the page. Returns a restore function. */
export function hideExtensionUi(): () => void {
  const els = document.querySelectorAll('[data-ctrlweb-ui]');
  const states: { el: HTMLElement; display: string; visibility: string }[] = [];

  els.forEach((el) => {
    if (el instanceof HTMLElement) {
      states.push({
        el,
        display: el.style.display,
        visibility: el.style.visibility,
      });
      el.style.display = 'none';
      el.style.visibility = 'hidden';
    }
  });

  return () => {
    states.forEach(({ el, display, visibility }) => {
      el.style.display = display;
      el.style.visibility = visibility;
    });
  };
}

export function waitForRepaint(ms = 80): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setTimeout(resolve, ms));
    });
  });
}
