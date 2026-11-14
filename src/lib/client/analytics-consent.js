const CHOICE_KEY = "ipc-analytics-consent-v1";

const readChoices = () => {
  try {
    const saved = window.localStorage.getItem(CHOICE_KEY);
    if (saved === "granted" || saved === "denied") {
      return { analytics: saved, advertising: "denied" };
    }
    const choice = JSON.parse(saved);
    if (
      !choice ||
      !["granted", "denied"].includes(choice.analytics) ||
      !["granted", "denied"].includes(choice.advertising)
    )
      return null;
    return choice;
  } catch {
    return null;
  }
};

export const readAnalyticsChoice = () => readChoices()?.analytics ?? null;
export const readAdvertisingChoice = () =>
  readChoices()?.advertising ?? "denied";

export const advertisingSettings = (choice) => ({
  allow_ad_personalization_signals: choice === "granted",
  allow_google_signals: choice === "granted",
});

export const consentState = (choice, advertising = "denied") => ({
  analytics_storage: choice === "granted" ? "granted" : "denied",
  ad_storage: advertising === "granted" ? "granted" : "denied",
  ad_user_data: advertising === "granted" ? "granted" : "denied",
  ad_personalization: advertising === "granted" ? "granted" : "denied",
});

const clearCookies = (analytics, advertising) => {
  const host = window.location.hostname.split(".");
  const domains = ["", ...host.map((_, index) => host.slice(index).join("."))];
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.trim().split("=")[0];
    const analyticsCookie = name === "_ga" || name.startsWith("_ga_");
    const advertisingCookie =
      name.startsWith("_gcl_") || name === "_gac" || name.startsWith("_gac_");
    if (!(analytics && analyticsCookie) && !(advertising && advertisingCookie))
      continue;
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
  const advertising = panel.querySelector("[data-advertising-enabled]");
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
    advertising.checked = readAdvertisingChoice() === "granted";
    status.textContent = `Analytics cookies: ${analytics.checked ? "allowed" : "declined"}. Advertising: ${advertising.checked ? "allowed" : "declined"}.`;
  };
  const apply = (choice, ads) => {
    if (typeof window.gtag === "function") {
      window.gtag("set", advertisingSettings(ads));
      window.gtag("consent", "update", consentState(choice, ads));
    }
    clearCookies(choice !== "granted", ads !== "granted");
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
  const save = (choice, ads) => {
    apply(choice, ads);
    advertising.checked = ads === "granted";
    analytics.checked = choice === "granted";
    try {
      window.localStorage.setItem(
        CHOICE_KEY,
        JSON.stringify({ analytics: choice, advertising: ads }),
      );
      hide();
      settings.focus();
    } catch {
      status.textContent =
        "Your choice applies to this page. Your browser could not save it for your next visit.";
    }
  };
  panel.querySelectorAll("[data-analytics-choice]").forEach((button) => {
    button.addEventListener("click", () =>
      save(button.dataset.analyticsChoice, button.dataset.analyticsChoice),
    );
  });
  panel.querySelector("[data-analytics-save]").addEventListener("click", () => {
    save(
      analytics.checked ? "granted" : "denied",
      advertising.checked ? "granted" : "denied",
    );
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== CHOICE_KEY && event.key !== null) return;
    apply(readAnalyticsChoice(), readAdvertisingChoice());
    if (readAnalyticsChoice() === null) show();
    else hide();
    render();
  });
  clearCookies(
    readAnalyticsChoice() !== "granted",
    readAdvertisingChoice() !== "granted",
  );
};
