export function showToast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
  const existing = document.querySelector('[data-ctrlweb-ui="toast"]');
  existing?.remove();

  const toast = document.createElement('div');
  toast.setAttribute('data-ctrlweb-ui', 'toast');
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'error' ? '#ff453a' : type === 'info' ? '#007aff' : '#1a1a1f'};
    border: 1px solid ${type === 'error' ? '#ff453a' : '#2a2a32'};
    color: #ffffff;
    padding: 10px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 13px;
    font-weight: 500;
    z-index: 2147483647;
    box-shadow: 0 4px 24px rgba(0,0,0,0.4);
    animation: ctrlweb-toast-in 0.2s ease;
  `;

  if (!document.querySelector('#ctrlweb-styles')) {
    const style = document.createElement('style');
    style.id = 'ctrlweb-styles';
    style.textContent = `
      @keyframes ctrlweb-toast-in {
        from { opacity: 0; transform: translateX(-50%) translateY(8px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      @media (prefers-reduced-motion: reduce) {
        [data-ctrlweb-ui="toast"] { animation: none; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.2s';
    setTimeout(() => toast.remove(), 200);
  }, 2500);
}

export function showError(message: string): void {
  showToast(message, 'error');
}

export function showProtectedPageError(): void {
  showError("CTRL+WEB can't modify this page. This page is protected by the browser.");
}
