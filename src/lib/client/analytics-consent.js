const CHOICE_KEY = "ipc-analytics-consent-v1";

export const readAnalyticsChoice = () => {
  try {
    const choice = window.localStorage.getItem(CHOICE_KEY);
    return choice === "granted" || choice === "denied" ? choice : null;
  } catch {
    return null;
  }
};

export const consentState = (choice) => ({
  analytics_storage: choice === "granted" ? "granted" : "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
});

const clearAnalyticsCookies = () => {
  const host = window.location.hostname.split(".");
  const domains = ["", ...host.map((_, index) => host.slice(index).join("."))];
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.trim().split("=")[0];
    if (name !== "_ga" && !name.startsWith("_ga_")) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ""}`;
    }
  }
};

export const initializeConsentControls = () => {
  const panel = document.querySelector("[data-analytics-consent]");
  const settings = document.querySelector("[data-privacy-settings]");
  if (!panel || !settings) return;
  const status = panel.querySelector("[data-consent-status]");
  const analytics = panel.querySelector("[data-analytics-enabled]");
  const show = () => {
    panel.hidden = false;
    if (!panel.open) panel.showModal();
  };
  const hide = () => {
    panel.close();
    panel.hidden = true;
  };
  const render = () => {
    const choice = readAnalyticsChoice();
    analytics.checked = choice === "granted";
    status.textContent =
      choice === "granted"
        ? "Analytics cookies are allowed."
        : "Analytics cookies are declined.";
  };
  const apply = (choice) => {
    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", consentState(choice));
    }
    if (choice !== "granted") clearAnalyticsCookies();
  };
  settings.hidden = false;
  render();
  if (readAnalyticsChoice() === null) show();
  panel.addEventListener("cancel", () => {
    panel.hidden = true;
  });
  settings.addEventListener("click", () => {
    render();
    show();
  });
  const save = (choice) => {
    apply(choice);
    analytics.checked = choice === "granted";
    try {
      window.localStorage.setItem(CHOICE_KEY, choice);
      hide();
      settings.focus();
    } catch {
      status.textContent =
        "Your choice applies to this page. Your browser could not save it for your next visit.";
    }
  };
  panel.querySelectorAll("[data-analytics-choice]").forEach((button) => {
    button.addEventListener("click", () =>
      save(button.dataset.analyticsChoice),
    );
  });
  panel.querySelector("[data-analytics-save]").addEventListener("click", () => {
    save(analytics.checked ? "granted" : "denied");
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== CHOICE_KEY && event.key !== null) return;
    apply(readAnalyticsChoice());
    if (readAnalyticsChoice() === null) show();
    else hide();
    render();
  });
  if (readAnalyticsChoice() !== "granted") clearAnalyticsCookies();
};
