import { defineConfig } from "@playwright/test";

const {
  FORCE_COLOR: _forceColor,
  NO_COLOR: _noColor,
  ...webServerEnv
} = process.env;

const webServer =
  process.env.PLAYWRIGHT_SKIP_WEB_SERVER === "1"
    ? undefined
    : {
        command: "mise exec -- npm run dev -- --host 127.0.0.1 --port 4321",
        url: "http://127.0.0.1:4321",
        reuseExistingServer: true,
        timeout: 120_000,
        env: {
          ...webServerEnv,
          DISABLE_ASTRO_DEV_TOOLBAR: "1",
          FORMS_API_PROXY_TARGET:
            process.env.FORMS_API_PROXY_TARGET || "https://example.com",
          RECAPTCHA_SITE_KEY: process.env.RECAPTCHA_SITE_KEY || "test-site-key",
        },
      };

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:4321",
    trace: "retain-on-failure",
  },
  webServer,
});
