const MAX_TOASTS = 4;
let container = null;

function ensureContainer() {
  if (container) {
    return container;
  }

  container = document.createElement('div');
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

export function show(message, type = 'info', duration = 4000) {
  const host = ensureContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.role = type === 'warning' || type === 'error' ? 'alert' : 'status';
  toast.textContent = message;
  host.appendChild(toast);

  while (host.children.length > MAX_TOASTS) {
    host.firstElementChild?.remove();
  }

  window.setTimeout(() => toast.remove(), duration);
}
