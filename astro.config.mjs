// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { loadEnv } from "vite";

import sentry from "@sentry/astro";
import { buildSitemapLastmodMap } from "./src/lib/sitemap-lastmod.js";

/**
 * @param {string} value
 * @param {string} name
 */
function requireNonEmptyString(value, name) {
  if (typeof value !== "string") {
    throw new Error(`${name} must be set.`);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new Error(`${name} must be a non-empty string.`);
  }

  return trimmed;
}

const formsApiProxyTarget = (process.env.FORMS_API_PROXY_TARGET || "").trim();
// Dev-only proxy target for astro dev. Production form submits use relative
// /api/* routes on the deployed site domain and do not require this variable.
const mode = process.env.NODE_ENV ?? "development";
const env = loadEnv(mode, process.cwd(), "");
const sentryEnvironment = requireNonEmptyString(
  env.PUBLIC_SENTRY_ENVIRONMENT,
  "PUBLIC_SENTRY_ENVIRONMENT",
);
const sentryDsn = requireNonEmptyString(
  env.PUBLIC_SENTRY_DSN,
  "PUBLIC_SENTRY_DSN",
);
const sentryOrg = (env.SENTRY_ORG || "").trim();
const sentryProject = (env.SENTRY_PROJECT || "").trim();
const sentryAuthToken = (env.SENTRY_AUTH_TOKEN || "").trim();
const recaptchaSiteKey = (env.RECAPTCHA_SITE_KEY || "").trim();
const sentryRelease =
  (process.env.GIT_COMMIT_SHA || env.GIT_COMMIT_SHA || "").trim() || undefined;
const shouldUploadSentrySourcemaps = Boolean(
  process.env.CI && sentryOrg && sentryProject && sentryAuthToken,
);
const SITEMAP_EXCLUDED_PATHS = new Set([
  "/404/",
  "/about/contact/",
  "/civil-litigation/",
  "/civil-litigation/new/",
  "/civil-litigation/suggest-edit/",
  "/law-enforcement-agency/",
  "/law-enforcement-agency/new/",
  "/law-enforcement-agency/suggest-edit/",
  "/legal-notice/data-subject-access-request/",
  "/personnel/new/",
  "/personnel/suggest-edit/",
  "/report/",
  "/report/new/",
  "/status/",
  "/volunteer/",
]);
let sitemapLastmodMapPromise;

const getSitemapLastmodMap = () => {
  sitemapLastmodMapPromise ??= buildSitemapLastmodMap();
  return sitemapLastmodMapPromise;
};

// https://astro.build/config
export default defineConfig({
  site: "https://www.policeconduct.org",
  devToolbar: {
    enabled: process.env.DISABLE_ASTRO_DEV_TOOLBAR !== "1",
  },
  build: {
    inlineStylesheets: "never",
  },
  vite: {
    optimizeDeps: {
      include: [
        "@sentry/astro",
        "aos",
        "bootstrap/js/dist/collapse",
        "bootstrap/js/dist/scrollspy",
        "bootstrap/js/dist/tab",
        "leaflet",
      ],
    },
    define: {
      "import.meta.env.RECAPTCHA_SITE_KEY": JSON.stringify(recaptchaSiteKey),
      "import.meta.env.PUBLIC_SENTRY_DSN": JSON.stringify(sentryDsn),
      "import.meta.env.PUBLIC_SENTRY_ENVIRONMENT":
        JSON.stringify(sentryEnvironment),
      "import.meta.env.PUBLIC_SENTRY_RELEASE": JSON.stringify(
        sentryRelease || "",
      ),
    },
    build: {
      sourcemap: "hidden",
    },
    server: {
      proxy: {
        "/api": {
          target: formsApiProxyTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  },
  integrations: [
    sitemap({
      entryLimit: 45000,
      filter: (page) => {
        const pathname = new URL(page).pathname;
        return !SITEMAP_EXCLUDED_PATHS.has(pathname);
      },
      serialize: async (item) => {
        const lastmodMap = await getSitemapLastmodMap();
        const pathname = new URL(item.url).pathname;
        const lastmod = lastmodMap.get(pathname);
        if (!lastmod) {
          return item;
        }
        return {
          ...item,
          lastmod,
        };
      },
    }),
    sentry({
      telemetry: false,
      enabled: {
        client: true,
        server: false,
      },
      ...(sentryOrg ? { org: sentryOrg } : {}),
      ...(sentryProject ? { project: sentryProject } : {}),
      ...(sentryAuthToken ? { authToken: sentryAuthToken } : {}),
      sourcemaps: shouldUploadSentrySourcemaps
        ? {
            assets: ["dist/_astro/**/*"],
          }
        : {
            disable: true,
          },
    }),
  ],
});
