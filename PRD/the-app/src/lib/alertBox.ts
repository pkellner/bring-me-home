type AlertType = "success" | "info" | "warning" | "error";

interface AlertOptions {
  message: string;
  type?: AlertType;
  durationMilliseconds?: number; // default 3000
  containerId?: string; // optional override to mount somewhere else
}

const DEFAULT_DURATION = 3000;
const DEFAULT_CONTAINER_ID = "alert-box-container";
const STYLE_ELEMENT_ID = "alert-box-styles";

function ensureStylesExist(): void {
  if (document.getElementById(STYLE_ELEMENT_ID)) {
    return;
  }

  const styleElement = document.createElement("style");
  styleElement.id = STYLE_ELEMENT_ID;
  styleElement.textContent = `
    .alert-box-container {
      position: fixed;
      top: 1rem;
      right: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      z-index: 9999;
      pointer-events: none;
    }

    .alert-box {
      display: flex;
      align-items: center;
      padding: 0.75rem 1rem;
      border-radius: 0.375rem;
      font-family: sans-serif;
      color: #fff;
      opacity: 0;
      transform: translateY(-10px);
      transition: opacity 150ms ease-out, transform 150ms ease-out;
      pointer-events: auto;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      max-width: 500px;
      word-wrap: break-word;
    }

    .alert-box.show {
      opacity: 1;
      transform: translateY(0);
    }

    .alert-success { background-color: #16a34a; }
    .alert-info    { background-color: #0ea5e9; }
    .alert-warning { background-color: #d97706; }
    .alert-error   { background-color: #dc2626; }
  `;
  document.head.appendChild(styleElement);
}

function getOrCreateContainer(containerId: string): HTMLElement {
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.className = "alert-box-container";
    document.body.appendChild(container);
  }
  return container;
}

export default function showAlertBox(options: AlertOptions): void {
  try {
    const {
      message,
      type = "info",
      durationMilliseconds = DEFAULT_DURATION,
      containerId = DEFAULT_CONTAINER_ID,
    } = options;

    ensureStylesExist();
    const container = getOrCreateContainer(containerId);

    const alertElement = document.createElement("div");
    alertElement.setAttribute("role", "alert");
    alertElement.textContent = message;
    alertElement.className = `alert-box alert-${type}`;

    container.appendChild(alertElement);

    // trigger enter animation
    requestAnimationFrame(() => {
      alertElement.classList.add("show");
    });

    // auto-remove after duration
    window.setTimeout(() => {
      alertElement.classList.remove("show");
      alertElement.addEventListener(
        "transitionend",
        () => {
          alertElement.remove();
          // clean up container if empty
          if (!container.hasChildNodes()) {
            container.remove();
          }
        },
        { once: true }
      );
    }, durationMilliseconds);
  } catch (error) {
    // fall back to native alert if something goes wrong
    window.alert(options.message);
    console.error("showAlertBox failed:", error);
  }
}

// Convenience helpers
export function showSuccessAlert(message: string, durationMilliseconds?: number): void {
  showAlertBox({ message, type: "success", durationMilliseconds });
}

export function showInfoAlert(message: string, durationMilliseconds?: number): void {
  showAlertBox({ message, type: "info", durationMilliseconds });
}

export function showWarningAlert(message: string, durationMilliseconds?: number): void {
  showAlertBox({ message, type: "warning", durationMilliseconds });
}

export function showErrorAlert(message: string, durationMilliseconds?: number): void {
  showAlertBox({ message, type: "error", durationMilliseconds });
}