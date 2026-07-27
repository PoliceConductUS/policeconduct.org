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

// Masthead search (MastheadSearch.astro): progressively enhances the plain
// `role="search"` GET form (action="/find-records/") with Pagefind's
// self-hosted, statically-built index. Pagefind's JS lives at
// /pagefind/pagefind.js only in the built site (produced post-`astro build`
// by `npx pagefind --site dist`, see package.json's `build` script) — it is
// absent in `astro dev` and would 404 there. That failure (and any other
// load/search failure) is swallowed: the plain form submission above is
// always the fallback, so degrading to it is silent and harmless.
//
// Loaded lazily on first focus/input of the field, not at page load, since
// every one of the site's ~100k pages renders this same masthead.
const PAGEFIND_MODULE_URL = "/pagefind/pagefind.js";
const SEARCH_DEBOUNCE_MS = 150;
const MAX_SEARCH_RESULTS = 8;

const initSiteSearch = () => {
  const form = document.querySelector("[data-site-search]");
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const input = form.querySelector("[data-site-search-input]");
  const panel = form.querySelector("[data-site-search-panel]");
  const listbox = form.querySelector("[data-site-search-listbox]");
  const status = form.querySelector("[data-site-search-status]");
  if (
    !(input instanceof HTMLInputElement) ||
    !(panel instanceof HTMLElement) ||
    !(listbox instanceof HTMLElement) ||
    !(status instanceof HTMLElement)
  ) {
    return;
  }

  let pagefindApi = null;
  let pagefindLoadPromise = null;
  let results = [];
  let activeIndex = -1;
  let requestId = 0;
  let debounceTimer = null;

  const loadPagefind = () => {
    if (!pagefindLoadPromise) {
      pagefindLoadPromise = import(/* @vite-ignore */ PAGEFIND_MODULE_URL)
        .then(async (module) => {
          pagefindApi = module;
          await module.init?.();
          return module;
        })
        .catch(() => {
          // No built index available (e.g. dev server, or the asset
          // failed to load) — leave pagefindApi null so search is a
          // silent no-op and the plain form submission keeps working.
          pagefindApi = null;
        });
    }
    return pagefindLoadPromise;
  };

  const setStatus = (text) => {
    status.textContent = text;
  };

  const closePanel = () => {
    panel.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    activeIndex = -1;
    // Clear results (not just hide the panel) so a stale result set can't
    // be reactivated: without this, ArrowDown after Escape would still see
    // results.length > 0 and move an aria-activedescendant onto an option
    // inside a hidden panel. Clearing here makes ArrowDown a no-op until
    // the next search runs.
    results = [];
    listbox.innerHTML = "";
  };

  const navigateToResult = (result) => {
    if (!result?.path) {
      return;
    }
    window.location.href = result.path;
  };

  const updateActiveDescendant = () => {
    if (activeIndex < 0) {
      input.removeAttribute("aria-activedescendant");
    } else {
      input.setAttribute(
        "aria-activedescendant",
        `site-search-option-${activeIndex}`,
      );
    }

    Array.from(listbox.children).forEach((child, index) => {
      const isActive = index === activeIndex;
      child.classList.toggle("is-active", isActive);
      child.setAttribute("aria-selected", isActive ? "true" : "false");
      if (isActive && child instanceof HTMLElement) {
        child.scrollIntoView({ block: "nearest" });
      }
    });
  };

  const renderResults = () => {
    listbox.innerHTML = "";

    results.forEach((result, index) => {
      const option = document.createElement("li");
      option.id = `site-search-option-${index}`;
      option.className = "masthead-search-option";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");

      const titleEl = document.createElement("span");
      titleEl.className = "masthead-search-option-title";
      titleEl.textContent = result.title;

      const pathEl = document.createElement("span");
      pathEl.className = "masthead-search-option-path";
      pathEl.textContent = result.path;

      option.append(titleEl, pathEl);
      // mousedown (not click) fires before the input blurs, so we can
      // preventDefault to keep focus on the input and navigate without
      // racing a blur-triggered panel close.
      option.addEventListener("mousedown", (event) => {
        event.preventDefault();
        navigateToResult(result);
      });

      listbox.appendChild(option);
    });

    if (results.length > 0) {
      panel.hidden = false;
      input.setAttribute("aria-expanded", "true");
    } else {
      closePanel();
    }
  };

  const runSearch = async (term) => {
    const currentRequestId = ++requestId;

    if (!term) {
      results = [];
      activeIndex = -1;
      renderResults();
      setStatus("");
      return;
    }

    await loadPagefind();
    if (currentRequestId !== requestId || !pagefindApi?.search) {
      return;
    }

    try {
      const search = await pagefindApi.search(term);
      if (currentRequestId !== requestId) {
        return;
      }

      const entries = await Promise.all(
        search.results
          .slice(0, MAX_SEARCH_RESULTS)
          .map((entry) => entry.data()),
      );
      if (currentRequestId !== requestId) {
        return;
      }

      results = entries.map((entry) => ({
        title: entry.meta?.title || entry.url,
        path: entry.url,
      }));
      activeIndex = -1;
      renderResults();
      setStatus(
        results.length === 0
          ? "No results"
          : results.length === 1
            ? "1 result"
            : `${results.length} results`,
      );
    } catch (_error) {
      // Search failed after the module loaded (e.g. a malformed index) —
      // stay silent; the plain form submission remains available.
    }
  };

  const debouncedSearch = (term) => {
    if (debounceTimer) {
      window.clearTimeout(debounceTimer);
    }
    debounceTimer = window.setTimeout(
      () => runSearch(term),
      SEARCH_DEBOUNCE_MS,
    );
  };

  input.addEventListener("focus", loadPagefind, { once: true });
  input.addEventListener("input", () => {
    debouncedSearch(input.value.trim());
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (results.length === 0) {
        return;
      }
      activeIndex = (activeIndex + 1) % results.length;
      updateActiveDescendant();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length === 0) {
        return;
      }
      activeIndex = (activeIndex - 1 + results.length) % results.length;
      updateActiveDescendant();
      return;
    }

    if (event.key === "Enter") {
      if (activeIndex >= 0 && results[activeIndex]) {
        event.preventDefault();
        navigateToResult(results[activeIndex]);
      }
      return;
    }

    if (event.key === "Escape" && !panel.hidden) {
      event.preventDefault();
      closePanel();
    }
  });

  document.addEventListener("click", (event) => {
    if (event.target instanceof Node && !form.contains(event.target)) {
      closePanel();
    }
  });

  // Tab-away (or any focus loss to something outside the search form)
  // closes the panel. This does not race the option mousedown+preventDefault
  // pattern above: preventDefault on mousedown stops the browser's default
  // focus-shift, so the input never blurs and this focusout handler never
  // fires for an option click — navigateToResult already runs synchronously
  // inside the mousedown handler.
  form.addEventListener("focusout", (event) => {
    const nextFocusTarget = event.relatedTarget;
    if (nextFocusTarget instanceof Node && form.contains(nextFocusTarget)) {
      return;
    }
    closePanel();
  });
};

initBetaBanner();
initHeaderScroll();
initAnalyticsClicks();
initMapAnalyticsClicks();
initCopyLink();
initJumpForms();
initSiteSearch();
