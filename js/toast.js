class Toast {
  static container = null;

  static init() {
    if (Toast.container) return;
    Toast.container = document.createElement('div');
    Toast.container.className = 'toast-container';
    document.body.appendChild(Toast.container);
  }

  /**
   * @param {string} message - Текст уведомления
   * @param {'info'|'success'|'warning'|'error'} type - Тип уведомления
   * @param {number} duration - Время показа в мс (0 = не скрывать)
   */
  static show(message, type = 'info', duration = 3000) {
    Toast.init();

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'alert');

    const icon = Toast.getIcon(type);
    const text = document.createElement('span');
    text.className = 'toast__text';
    text.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast__close';
    closeBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M18 6L6 18"/><path d="M6 6L18 18"/>
      </svg>
    `;
    closeBtn.addEventListener('click', () => Toast.dismiss(toast));

    toast.appendChild(icon);
    toast.appendChild(text);
    toast.appendChild(closeBtn);
    Toast.container.appendChild(toast);

    // Анимация появления
    requestAnimationFrame(() => {
      toast.classList.add('toast--visible');
    });

    // Авто-скрытие
    if (duration > 0) {
      setTimeout(() => Toast.dismiss(toast), duration);
    }

    return toast;
  }

  static dismiss(toast) {
    if (!toast || toast.classList.contains('toast--leaving')) return;
    toast.classList.remove('toast--visible');
    toast.classList.add('toast--leaving');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  static getIcon(type) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.classList.add('toast__icon');

    let path;
    switch (type) {
      case 'success':
        path = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>';
        break;
      case 'warning':
        path = '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>';
        break;
      case 'error':
        path = '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>';
        break;
      default: // info
        path = '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>';
        break;
    }
    svg.innerHTML = path;
    return svg;
  }
}