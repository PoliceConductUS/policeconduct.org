import "bootstrap/js/dist/collapse";
import "bootstrap/js/dist/scrollspy";
import "bootstrap/js/dist/tab";

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
      window.__IPC_PREFILL__?.set?.(key, payload);
    } catch (_error) {
      // Ignore malformed payloads.
    }
  });
};

initBetaBanner();
initHeaderScroll();
initPrefillLinks();
