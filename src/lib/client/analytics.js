import {
  readAnalyticsChoice,
  readAdvertisingChoice,
  advertisingSettings,
  consentState,
} from "./analytics-consent.js";

const MEASUREMENT_ID = "G-40S6M70XP7";
const ATTRIBUTION_PARAMETERS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_id",
  "utm_content",
  "utm_term",
  "gclid",
  "dclid",
  "gbraid",
  "wbraid",
]);
const URL_PARAMETERS = new Set([
  "page_location",
  "page_referrer",
  "destination_url",
  "page_path",
  "href_path",
  "prefill_key",
]);

const isProduction = () =>
  window.location.protocol === "https:" &&
  ["policeconduct.org", "www.policeconduct.org"].includes(window.location.host);

const sanitizeUrl = (value) => {
  if (!value) return "";
  try {
    const url = new URL(value, window.location.origin);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    url.username = "";
    url.password = "";
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (!ATTRIBUTION_PARAMETERS.has(key)) url.searchParams.delete(key);
    }
    return url.href;
  } catch {
    return "";
  }
};

const pageContext = () => ({
  page_location: sanitizeUrl(window.location.href),
  page_path: window.location.pathname,
  page_referrer: sanitizeUrl(document.referrer),
});

export const trackAnalytics = (eventName, params = {}) => {
  if (!isProduction() || !eventName || typeof window.gtag !== "function")
    return;
  const payload = { ...pageContext(), ...params };
  for (const key of Object.keys(payload)) {
    if (URL_PARAMETERS.has(key)) {
      const url = sanitizeUrl(payload[key]);
      payload[key] =
        url && (key.endsWith("_path") || key === "prefill_key")
          ? new URL(url).pathname
          : url;
    }
    const value = payload[key];
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      Number.isNaN(value)
    ) {
      delete payload[key];
    }
  }
  window.gtag("event", eventName, payload);
};

export const initializeAnalytics = () => {
  window.__IPC_ANALYTICS__ = { track: trackAnalytics };
  if (!isProduction()) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params -- Google's command dispatcher requires an Arguments object, not a rest Array.
    if (isProduction()) window.dataLayer.push(arguments);
  };
  window.gtag(
    "consent",
    "default",
    consentState(readAnalyticsChoice(), readAdvertisingChoice()),
  );
  window.gtag("set", advertisingSettings(readAdvertisingChoice()));
  const context = pageContext();
  window.gtag("js", new Date());
  window.gtag("set", context);
  window.gtag("config", MEASUREMENT_ID, {
    ...context,
    page_title: document.title,
    send_page_view: false,
  });
  trackAnalytics("page_view");
  const script = document.createElement("script");
  script.async = true;
  script.referrerPolicy = "origin";
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);
};
