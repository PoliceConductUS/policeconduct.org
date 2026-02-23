// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const formsApiProxyTarget = (process.env.FORMS_API_PROXY_TARGET || "").trim();
// Dev-only proxy target for astro dev. Production form submits use relative
// /api/* routes on the deployed site domain and do not require this variable.

// https://astro.build/config
export default defineConfig({
  site: "https://www.policeconduct.org",
  build: {
    inlineStylesheets: "always",
  },
  vite: {
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
    }),
  ],
});
