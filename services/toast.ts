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

/**
 * Validation Error Popup — ใหญ่ เห็นชัด แสดงรายการ field ที่ขาด
 * ใช้สำหรับ form validation เท่านั้น
 */
export function showValidationError(missingFields: string[], title?: string) {
  // Remove existing validation popup if any
  const existing = document.getElementById('validation-error-popup');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'validation-error-popup';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    display: flex; align-items: flex-start; justify-content: center;
    padding-top: min(80px, 15vh);
    background: rgba(0,0,0,0.3);
    backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    opacity: 0;
    transition: opacity 0.25s ease;
  `;

  const card = document.createElement('div');
  card.style.cssText = `
    background: white;
    border-radius: 20px;
    padding: 24px 24px;
    max-width: min(380px, calc(100vw - 32px));
    width: 100%;
    box-shadow: 0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05);
    transform: translateY(-20px) scale(0.95);
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  `;

  // Check dark mode
  if (document.documentElement.classList.contains('dark')) {
    card.style.background = '#1c1c1e';
    card.style.boxShadow = '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)';
  }

  // Icon
  const iconDiv = document.createElement('div');
  iconDiv.style.cssText = `
    width: 48px; height: 48px; border-radius: 14px;
    background: #fee2e2; display: flex; align-items: center; justify-content: center;
    margin-bottom: 16px;
  `;
  iconDiv.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  // Title
  const titleEl = document.createElement('div');
  titleEl.textContent = title || 'กรุณากรอกข้อมูลให้ครบ';
  const isDark = document.documentElement.classList.contains('dark');
  titleEl.style.cssText = `
    font-size: 18px; font-weight: 700; margin-bottom: 12px;
    color: ${isDark ? '#f5f5f7' : '#1d1d1f'};
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Sarabun', sans-serif;
  `;

  // List of missing fields
  const list = document.createElement('ul');
  list.style.cssText = `
    list-style: none; padding: 0; margin: 0 0 20px 0;
  `;
  missingFields.forEach(field => {
    const li = document.createElement('li');
    li.style.cssText = `
      padding: 8px 12px; margin-bottom: 6px;
      background: ${isDark ? '#2c2c2e' : '#fef2f2'};
      border-radius: 10px;
      font-size: 14px; font-weight: 500;
      color: ${isDark ? '#fca5a5' : '#dc2626'};
      display: flex; align-items: center; gap: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Sarabun', sans-serif;
    `;
    li.innerHTML = `<span style="color:#ef4444;font-size:16px;font-weight:700;">✕</span> ${field}`;
    list.appendChild(li);
  });

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'เข้าใจแล้ว';
  closeBtn.style.cssText = `
    width: 100%; padding: 12px;
    background: #ef4444; color: white;
    border: none; border-radius: 12px;
    font-size: 15px; font-weight: 600;
    cursor: pointer;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Sarabun', sans-serif;
    transition: background 0.2s;
  `;
  closeBtn.onmouseenter = () => { closeBtn.style.background = '#dc2626'; };
  closeBtn.onmouseleave = () => { closeBtn.style.background = '#ef4444'; };

  const dismiss = () => {
    overlay.style.opacity = '0';
    card.style.transform = 'translateY(-20px) scale(0.95)';
    setTimeout(() => overlay.remove(), 300);
  };

  closeBtn.onclick = dismiss;
  overlay.onclick = (e) => { if (e.target === overlay) dismiss(); };

  card.appendChild(iconDiv);
  card.appendChild(titleEl);
  card.appendChild(list);
  card.appendChild(closeBtn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      card.style.transform = 'translateY(0) scale(1)';
    });
  });

  // Auto dismiss after 8 seconds
  setTimeout(dismiss, 8000);
}
