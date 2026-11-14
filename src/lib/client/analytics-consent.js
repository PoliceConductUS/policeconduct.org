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
  const render = () => {
    const choice = readAnalyticsChoice();
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
  panel.hidden = readAnalyticsChoice() !== null;
  render();
  settings.addEventListener("click", () => {
    panel.hidden = false;
    render();
    panel.querySelector("button").focus();
  });
  panel.querySelectorAll("[data-analytics-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      const choice = button.dataset.analyticsChoice;
      apply(choice);
      try {
        window.localStorage.setItem(CHOICE_KEY, choice);
        panel.hidden = true;
        settings.focus();
      } catch {
        status.textContent =
          "Your choice applies to this page. Your browser could not save it for your next visit.";
      }
    });
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== CHOICE_KEY && event.key !== null) return;
    apply(readAnalyticsChoice());
    panel.hidden = readAnalyticsChoice() !== null;
    render();
  });
  if (readAnalyticsChoice() !== "granted") clearAnalyticsCookies();
};
