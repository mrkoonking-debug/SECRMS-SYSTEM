/**
 * Premium toast notification — Apple-style, minimal, elegant.
 * Auto-dismissing with smooth slide + fade animation.
 */

let toastContainer: HTMLDivElement | null = null;

function getContainer(): HTMLDivElement {
  if (toastContainer && document.body.contains(toastContainer)) return toastContainer;
  toastContainer = document.createElement('div');
  toastContainer.style.cssText = `
    position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
    z-index: 99999; display: flex; flex-direction: column; align-items: center; gap: 10px;
    pointer-events: none;
  `;
  document.body.appendChild(toastContainer);
  return toastContainer;
}

type ToastType = 'success' | 'error' | 'info' | 'warning';

export function showToast(message: string, type: ToastType = 'success', durationMs?: number) {
  const duration = durationMs ?? (type === 'error' || type === 'warning' ? 3500 : 2200);
  const container = getContainer();

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: rgba(28,28,30,0.92);
    color: #f5f5f7;
    padding: 13px 22px;
    border-radius: 100px;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Sarabun', sans-serif;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: -0.01em;
    line-height: 1.35;
    box-shadow: 0 4px 24px rgba(0,0,0,0.25), 0 0 0 0.5px rgba(255,255,255,0.08) inset;
    backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px);
    pointer-events: auto;
    display: flex; align-items: center; gap: 8px;
    opacity: 0; transform: translateY(-16px) scale(0.96);
    transition: opacity 0.35s cubic-bezier(0.4,0,0.2,1), transform 0.35s cubic-bezier(0.4,0,0.2,1);
    max-width: min(420px, 88vw);
    white-space: normal;
    word-break: break-word;
  `;

  // Minimal icon dot
  const dot = document.createElement('span');
  const dotColor = type === 'success' ? '#34d399' : type === 'error' ? '#f87171' : type === 'warning' ? '#fbbf24' : '#60a5fa';
  dot.style.cssText = `
    width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
    background: ${dotColor};
    box-shadow: 0 0 6px ${dotColor}80;
  `;

  const text = document.createElement('span');
  text.textContent = message;

  toast.appendChild(dot);
  toast.appendChild(text);
  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0) scale(1)';
    });
  });

  // Animate out + remove
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px) scale(0.97)';
    setTimeout(() => {
      toast.remove();
      if (container.children.length === 0) {
        container.remove();
        toastContainer = null;
      }
    }, 400);
  }, duration);
}
