// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { loadEnv } from "vite";

import sentry from "@sentry/astro";

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
const SITEMAP_EXCLUDED_PATHS = new Set([
  "/404/",
  "/about/contact/",
  "/civil-litigation/new/",
  "/civil-litigation/suggest-edit/",
  "/law-enforcement-agency/new/",
  "/law-enforcement-agency/suggest-edit/",
  "/legal-notice/data-subject-access-request/",
  "/personnel/new/",
  "/personnel/suggest-edit/",
  "/report/new/",
  "/status/",
  "/volunteer/",
]);

// https://astro.build/config
export default defineConfig({
  site: "https://www.policeconduct.org",
  build: {
    inlineStylesheets: "always",
  },
  vite: {
    define: {
      "import.meta.env.PUBLIC_SENTRY_DSN": JSON.stringify(sentryDsn),
      "import.meta.env.PUBLIC_SENTRY_ENVIRONMENT":
        JSON.stringify(sentryEnvironment),
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
    }),
    sentry(),
  ],
});
