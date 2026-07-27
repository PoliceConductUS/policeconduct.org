import "bootstrap/js/dist/collapse";
import "bootstrap/js/dist/scrollspy";
import "bootstrap/js/dist/tab";

window.__IPC_ANALYTICS__ = window.__IPC_ANALYTICS__ || {
  track(eventName, params = {}) {
    if (!eventName || typeof window.gtag !== "function") {
      return;
    }

    const payload = {
      page_path: window.location.pathname,
      ...params,
    };

    Object.keys(payload).forEach((key) => {
      const value = payload[key];
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        Number.isNaN(value)
      ) {
        delete payload[key];
      }
    });

    window.gtag("event", eventName, payload);
  },
};

const trackAnalytics = (eventName, params = {}) => {
  window.__IPC_ANALYTICS__?.track?.(eventName, params);
};

const normalizeText = (value) => value?.replace(/\s+/g, " ").trim() || "";

const getHrefDetails = (anchor) => {
  const href = anchor.getAttribute("href") || "";
  if (!href) {
    return null;
  }

  try {
    const url = new URL(anchor.href, window.location.origin);
    return {
      href,
      absoluteHref: url.toString(),
      host: url.host,
      origin: url.origin,
      path: `${url.pathname}${url.search}`,
      isExternal: url.origin !== window.location.origin,
    };
  } catch (_error) {
    return {
      href,
      absoluteHref: href,
      host: "",
      origin: "",
      path: href,
      isExternal: false,
    };
  }
};

const getSectionId = (element) => element.closest("section[id]")?.id || "";

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

const initAnalyticsClicks = () => {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const anchor = target.closest("a[href]");
    if (!(anchor instanceof HTMLAnchorElement)) {
      return;
    }

    const hrefDetails = getHrefDetails(anchor);
    if (!hrefDetails || !hrefDetails.href || hrefDetails.href.startsWith("#")) {
      return;
    }

    const basePayload = {
      href_path: hrefDetails.path,
      link_text: normalizeText(anchor.textContent),
      page_path: window.location.pathname,
      section_id: getSectionId(anchor),
    };

    if (anchor.closest(".navbar")) {
      trackAnalytics(
        anchor.closest(".nav-cta") ? "nav_cta_click" : "nav_link_click",
        basePayload,
      );
      return;
    }

    if (anchor.classList.contains("btn")) {
      trackAnalytics("cta_click", basePayload);
    }

    if (hrefDetails.isExternal) {
      trackAnalytics("outbound_link_click", {
        ...basePayload,
        destination_host: hrefDetails.host,
        destination_url: hrefDetails.absoluteHref,
      });
    }
  });

  const navToggler = document.querySelector(".navbar-toggler");
  if (navToggler instanceof HTMLButtonElement) {
    navToggler.addEventListener("click", () => {
      trackAnalytics("nav_menu_toggle", {
        page_path: window.location.pathname,
      });
    });
  }
};

const initMapAnalyticsClicks = () => {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const link = target.closest("a[data-map-link-type]");
    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }

    const cardRoot = link.closest("[data-usa-map-card]");
    if (!cardRoot) {
      return;
    }

    const linkType = link.dataset.mapLinkType || "";
    const basePayload = {
      destination_url: link.href,
      map_label: link.dataset.mapLabel || "",
      page_path: window.location.pathname,
    };

    if (linkType === "state") {
      trackAnalytics("map_state_selected", {
        ...basePayload,
        state_count: link.dataset.stateCount || "",
        state_id: link.dataset.stateId || "",
      });
      return;
    }

    if (linkType === "header_action") {
      trackAnalytics("map_header_action_clicked", basePayload);
      return;
    }

    trackAnalytics("map_federal_link_clicked", {
      ...basePayload,
      link_type: linkType,
    });
  });
};

// Copy the given text to the clipboard, preferring the async Clipboard API
// and falling back to the classic select + execCommand("copy") trick for
// browsers/contexts (e.g. non-secure origins) where it is unavailable.
const copyTextToClipboard = async (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_error) {
      // Fall through to the select+execCommand fallback below.
    }
  }

  const scratch = document.createElement("textarea");
  scratch.value = text;
  scratch.setAttribute("readonly", "");
  scratch.style.position = "fixed";
  scratch.style.opacity = "0";
  document.body.appendChild(scratch);
  scratch.select();
  scratch.setSelectionRange(0, scratch.value.length);

  let succeeded = false;
  try {
    succeeded = document.execCommand("copy");
  } catch (_error) {
    succeeded = false;
  }
  document.body.removeChild(scratch);
  return succeeded;
};

// Shared entity action-bar "Copy link" behavior (EntityActionBar.astro).
// The anchor's href is a real, working same-page link so the no-JS
// experience is a harmless reload; with JS, intercept the click and copy
// the current page's URL instead.
const initCopyLink = () => {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const trigger = target.closest("[data-copy-link]");
    if (!(trigger instanceof HTMLAnchorElement)) {
      return;
    }

    event.preventDefault();
    const originalText = trigger.textContent;
    const url = window.location.href;

    copyTextToClipboard(url).then((succeeded) => {
      trigger.textContent = succeeded ? "Copied!" : "Couldn't copy";
      window.setTimeout(() => {
        trigger.textContent = originalText;
      }, 1600);
    });
  });
};

// Shared "jump to a child record" enhancement: a <select> + submit that
// works as a plain form (no-JS) and, with JS, navigates as soon as the form
// is submitted. Used by the civic-index drill-down cell
// (CivicIndexPage.astro) and any future page that renders the same markup
// contract: a form[data-jump-form] containing select[data-jump-select], with
// an optional sibling [data-jump-status] (in the form's parent) for
// aria-live feedback.
const initJumpForms = () => {
  document.querySelectorAll("[data-jump-form]").forEach((form) => {
    const select = form.querySelector("[data-jump-select]");
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }
    const status = form.parentElement?.querySelector("[data-jump-status]");
    const setStatus = (text) => {
      if (status) {
        status.textContent = text;
      }
    };

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const option = select.options[select.selectedIndex];
      if (!option || !option.value) {
        setStatus("Choose one first.");
        return;
      }
      setStatus(`Opening ${option.textContent.trim()} →`);
      window.location.href = option.value;
    });
  });
};

initBetaBanner();
initHeaderScroll();
initAnalyticsClicks();
initMapAnalyticsClicks();
initCopyLink();
initJumpForms();
