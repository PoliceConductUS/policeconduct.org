import "bootstrap/dist/js/bootstrap.bundle.min.js";
import AOS from "aos";
import "aos/dist/aos.css";
import { readAndConsumeFlashPrefill, setFlashPrefill } from "#src/lib/prefill";

const initBetaBanner = () => {
  const storageKey = "ipc_beta_banner_dismissed_v1";
  const banner = document.querySelector(".beta-banner");
  if (!banner) {
    return;
  }
  try {
    if (localStorage.getItem(storageKey) === "1") {
      banner.remove();
      return;
    }
  } catch (_err) {
    // Ignore localStorage errors.
  }

  const closeButton = banner.querySelector(".btn-close");
  if (closeButton) {
    closeButton.addEventListener("click", () => {
      try {
        localStorage.setItem(storageKey, "1");
      } catch (_err) {
        // Ignore localStorage errors.
      }
      banner.remove();
    });
  }
};

const initHeaderScroll = () => {
  const header = document.querySelector(".navbar");
  if (!header) {
    return;
  }
  const addClassOnScroll = () => header.classList.add("scrolled", "shadow-sm");
  const removeClassOnScroll = () =>
    header.classList.remove("scrolled", "shadow-sm");
  const onScroll = () => {
    if (window.scrollY > 10) {
      addClassOnScroll();
    } else {
      removeClassOnScroll();
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
};

const initAos = () => {
  if (document.documentElement.dataset.aosInit) {
    return;
  }
  AOS.init({
    duration: 800,
    once: true,
  });
  document.documentElement.dataset.aosInit = "1";
};

const initPrefillLinks = () => {
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-prefill-key]");
    if (!target) {
      return;
    }
    const key = target.getAttribute("data-prefill-key");
    const payloadRaw = target.getAttribute("data-prefill-payload");
    if (!key || !payloadRaw) {
      return;
    }
    try {
      const payload = JSON.parse(payloadRaw);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return;
      }
      setFlashPrefill(key, payload);
    } catch (_error) {
      // Ignore malformed payloads.
    }
  });
};

const getPrefillErrorArea = (key) => {
  let area = document.querySelector("[data-prefill-error-area]");
  if (!area) {
    area = document.createElement("div");
    area.setAttribute("data-prefill-error-area", "true");
    area.className = "d-none";
    document.body.appendChild(area);
  }
  area.setAttribute("data-prefill-last-key", key || "");
  return area;
};

const setFieldValue = (field, value) => {
  if (field instanceof HTMLInputElement) {
    const type = (field.type || "text").toLowerCase();
    if (type === "checkbox") {
      if (typeof value === "boolean") {
        field.checked = value;
        return true;
      }
      const normalized = String(value).trim().toLowerCase();
      field.checked =
        normalized === "true" ||
        normalized === "1" ||
        normalized === "yes" ||
        normalized === "on";
      return true;
    }
    if (type === "radio") {
      const expected = String(value ?? "").trim();
      if (field.value === expected) {
        field.checked = true;
      }
      return true;
    }
    if (!field.value.trim()) {
      field.value = String(value ?? "");
    }
    return true;
  }

  if (field instanceof HTMLTextAreaElement) {
    if (!field.value.trim()) {
      field.value = String(value ?? "");
    }
    return true;
  }

  if (field instanceof HTMLSelectElement) {
    field.value = String(value ?? "");
    return true;
  }

  return false;
};

const prefillFields = ({ key, root = document, consume = true }) => {
  if (!key || !window.__IPC_PREFILL__) {
    return { applied: false, missing: [], payload: null };
  }
  const payload = consume ? window.__IPC_PREFILL__.readAndConsume?.(key) : null;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { applied: false, missing: [], payload: null };
  }

  const missing = [];
  for (const [name, value] of Object.entries(payload)) {
    const fields = Array.from(root.querySelectorAll("[name]")).filter(
      (field) => field.getAttribute("name") === name,
    );
    if (fields.length === 0) {
      missing.push(name);
      continue;
    }
    for (const field of fields) {
      setFieldValue(field, value);
    }
  }

  const area = getPrefillErrorArea(key);
  if (missing.length > 0) {
    const details = {
      key,
      missing,
      payloadKeys: Object.keys(payload),
    };
    area.setAttribute("data-prefill-error", "true");
    area.textContent = JSON.stringify(details);
    console.error("Prefill field mismatch", details);
  } else {
    area.removeAttribute("data-prefill-error");
    area.textContent = "";
  }

  return { applied: true, missing, payload };
};

window.__IPC_PREFILL__ = {
  ...(window.__IPC_PREFILL__ || {}),
  set: setFlashPrefill,
  readAndConsume: readAndConsumeFlashPrefill,
  prefillFields,
};

initBetaBanner();
initHeaderScroll();
initAos();
initPrefillLinks();
