/**
 * Premium toast notification — Apple-style, minimal, elegant.
 * Auto-dismissing with smooth slide + fade animation.
 */

/**
 * Scroll main app container (or window fallback) to top smoothly.
 */
export function scrollAppToTop(behavior: ScrollBehavior = 'smooth') {
  const scrollEl = document.getElementById('app-main-scroll');
  if (scrollEl) {
    scrollEl.scrollTo({ top: 0, behavior });
  }
  window.scrollTo({ top: 0, behavior });
}

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger' | 'warning';
}

/**
 * Clean Modern SaaS confirmation dialog replacing native window.confirm().
 */
export function showConfirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const existing = document.getElementById('sec-confirm-dialog');
    if (existing) existing.remove();

    const isDark = document.documentElement.classList.contains('dark');
    const variant = options.variant || 'primary';

    const overlay = document.createElement('div');
    overlay.id = 'sec-confirm-dialog';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
      background: rgba(15, 23, 42, 0.55);
      opacity: 0;
      transition: opacity 0.18s ease;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
      background: ${isDark ? '#16181d' : '#ffffff'};
      border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)'};
      border-radius: 16px;
      padding: 24px;
      max-width: min(420px, calc(100vw - 32px));
      width: 100%;
      box-shadow: 0 20px 50px rgba(0,0,0,${isDark ? '0.55' : '0.18'});
      transform: translateY(8px) scale(0.97);
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Sarabun', sans-serif;
    `;

    const palette =
      variant === 'danger'
        ? {
            iconBg: isDark ? 'rgba(239, 68, 68, 0.14)' : '#fef2f2',
            iconColor: '#ef4444',
            btnBg: '#dc2626',
            btnHover: '#b91c1c',
            svg: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
          }
        : variant === 'warning'
        ? {
            iconBg: isDark ? 'rgba(245, 158, 11, 0.14)' : '#fffbeb',
            iconColor: '#f59e0b',
            btnBg: '#d97706',
            btnHover: '#b45309',
            svg: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
          }
        : {
            iconBg: isDark ? 'rgba(0, 113, 227, 0.16)' : '#eff6ff',
            iconColor: '#0071e3',
            btnBg: '#0071e3',
            btnHover: '#0062c4',
            svg: '<circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/>'
          };

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; align-items: flex-start; gap: 14px; margin-bottom: 18px;';

    const iconWrap = document.createElement('div');
    iconWrap.style.cssText = `
      width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
      background: ${palette.iconBg}; display: flex; align-items: center; justify-content: center;
    `;
    iconWrap.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${palette.iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${palette.svg}</svg>`;

    const textWrap = document.createElement('div');
    textWrap.style.cssText = 'flex: 1; min-width: 0;';

    const titleEl = document.createElement('div');
    titleEl.textContent = options.title || (variant === 'danger' ? 'ยืนยันการลบข้อมูล' : 'ยืนยันการดำเนินการ');
    titleEl.style.cssText = `
      font-size: 16px; font-weight: 700; line-height: 1.35; margin-bottom: 6px;
      color: ${isDark ? '#f8fafc' : '#0f172a'};
    `;

    const msgEl = document.createElement('div');
    msgEl.textContent = options.message;
    msgEl.style.cssText = `
      font-size: 13.5px; line-height: 1.55; white-space: pre-line; word-break: break-word;
      color: ${isDark ? '#94a3b8' : '#475569'};
    `;

    textWrap.appendChild(titleEl);
    textWrap.appendChild(msgEl);
    header.appendChild(iconWrap);
    header.appendChild(textWrap);

    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; justify-content: flex-end; gap: 10px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = options.cancelText || 'ยกเลิก';
    cancelBtn.style.cssText = `
      padding: 9px 16px; border-radius: 10px; font-size: 13.5px; font-weight: 600; cursor: pointer;
      border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.12)'};
      background: ${isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
      color: ${isDark ? '#cbd5e1' : '#334155'};
      transition: background 0.15s;
    `;
    cancelBtn.onmouseenter = () => { cancelBtn.style.background = isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'; };
    cancelBtn.onmouseleave = () => { cancelBtn.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc'; };

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.textContent = options.confirmText || 'ยืนยัน';
    confirmBtn.style.cssText = `
      padding: 9px 18px; border-radius: 10px; font-size: 13.5px; font-weight: 600; cursor: pointer;
      border: none; background: ${palette.btnBg}; color: #ffffff;
      transition: background 0.15s;
    `;
    confirmBtn.onmouseenter = () => { confirmBtn.style.background = palette.btnHover; };
    confirmBtn.onmouseleave = () => { confirmBtn.style.background = palette.btnBg; };

    let settled = false;
    const cleanup = (result: boolean) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKeyDown);
      overlay.style.opacity = '0';
      card.style.transform = 'translateY(8px) scale(0.97)';
      setTimeout(() => overlay.remove(), 180);
      resolve(result);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cleanup(false);
    };
    document.addEventListener('keydown', onKeyDown);

    cancelBtn.onclick = () => cleanup(false);
    confirmBtn.onclick = () => cleanup(true);
    overlay.onclick = (e) => {
      if (e.target === overlay) cleanup(false);
    };

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    card.appendChild(header);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        card.style.transform = 'translateY(0) scale(1)';
      });
    });
  });
}

let toastContainer: HTMLDivElement | null = null;

function getContainer(): HTMLDivElement {
  if (toastContainer && document.body.contains(toastContainer)) return toastContainer;
  toastContainer = document.createElement('div');
  toastContainer.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    z-index: 99999; display: flex; flex-direction: column; align-items: center; gap: 8px;
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
    background: rgba(17, 24, 39, 0.94);
    color: #f8fafc;
    padding: 11px 18px;
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Sarabun', sans-serif;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: -0.01em;
    line-height: 1.4;
    box-shadow: 0 8px 24px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.08);
    pointer-events: auto;
    display: flex; align-items: center; gap: 8px;
    opacity: 0; transform: translateY(-12px) scale(0.97);
    transition: opacity 0.25s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.4,0,0.2,1);
    max-width: min(440px, 90vw);
    white-space: normal;
    word-break: break-word;
  `;

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

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0) scale(1)';
    });
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px) scale(0.97)';
    setTimeout(() => {
      toast.remove();
      if (container.children.length === 0) {
        container.remove();
        toastContainer = null;
      }
    }, 300);
  }, duration);
}

/**
 * Validation Error Popup — Clean Modern SaaS style showing missing fields
 */
export function showValidationError(missingFields: string[], title?: string) {
  const existing = document.getElementById('validation-error-popup');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'validation-error-popup';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
    background: rgba(15, 23, 42, 0.45);
    opacity: 0;
    transition: opacity 0.2s ease;
  `;

  const isDark = document.documentElement.classList.contains('dark');

  const card = document.createElement('div');
  card.style.cssText = `
    background: ${isDark ? '#16181d' : '#ffffff'};
    border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)'};
    border-radius: 16px;
    padding: 24px;
    max-width: min(400px, calc(100vw - 32px));
    width: 100%;
    box-shadow: 0 20px 50px rgba(0,0,0,${isDark ? '0.55' : '0.2'});
    transform: translateY(-10px) scale(0.97);
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  const iconDiv = document.createElement('div');
  iconDiv.style.cssText = `
    width: 44px; height: 44px; border-radius: 12px;
    background: ${isDark ? 'rgba(239, 68, 68, 0.14)' : '#fee2e2'};
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 14px;
  `;
  iconDiv.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  const titleEl = document.createElement('div');
  titleEl.textContent = title || 'กรุณากรอกข้อมูลให้ครบ';
  titleEl.style.cssText = `
    font-size: 17px; font-weight: 700; margin-bottom: 12px;
    color: ${isDark ? '#f8fafc' : '#0f172a'};
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Sarabun', sans-serif;
  `;

  const list = document.createElement('ul');
  list.style.cssText = 'list-style: none; padding: 0; margin: 0 0 18px 0;';
  missingFields.forEach(field => {
    const li = document.createElement('li');
    li.style.cssText = `
      padding: 8px 12px; margin-bottom: 6px;
      background: ${isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2'};
      border: 1px solid ${isDark ? 'rgba(239, 68, 68, 0.2)' : '#fecaca'};
      border-radius: 10px;
      font-size: 13.5px; font-weight: 500;
      color: ${isDark ? '#fca5a5' : '#dc2626'};
      display: flex; align-items: center; gap: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Sarabun', sans-serif;
    `;
    const xBadge = document.createElement('span');
    xBadge.textContent = '✕';
    xBadge.style.cssText = 'color: #ef4444; font-size: 13px; font-weight: 700; flex-shrink: 0;';
    const fieldText = document.createElement('span');
    fieldText.textContent = field;
    li.appendChild(xBadge);
    li.appendChild(fieldText);
    list.appendChild(li);
  });

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'เข้าใจแล้ว';
  closeBtn.style.cssText = `
    width: 100%; padding: 11px;
    background: #ef4444; color: white;
    border: none; border-radius: 10px;
    font-size: 14px; font-weight: 600;
    cursor: pointer;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Sarabun', sans-serif;
    transition: background 0.15s;
  `;
  closeBtn.onmouseenter = () => { closeBtn.style.background = '#dc2626'; };
  closeBtn.onmouseleave = () => { closeBtn.style.background = '#ef4444'; };

  const dismiss = () => {
    overlay.style.opacity = '0';
    card.style.transform = 'translateY(-10px) scale(0.97)';
    setTimeout(() => overlay.remove(), 220);
  };

  closeBtn.onclick = dismiss;
  overlay.onclick = (e) => { if (e.target === overlay) dismiss(); };

  card.appendChild(iconDiv);
  card.appendChild(titleEl);
  card.appendChild(list);
  card.appendChild(closeBtn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      card.style.transform = 'translateY(0) scale(1)';
    });
  });

  setTimeout(dismiss, 8000);
}
