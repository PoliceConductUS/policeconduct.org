// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const formsApiProxyTarget = (process.env.FORMS_API_PROXY_TARGET || "").trim();
const useFormsApiProxy = formsApiProxyTarget.length > 0;
const localDraftStore = new Map();

function writeJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      resolve(raw);
    });
    req.on("error", reject);
  });
}

function formsApiMockPlugin() {
  return {
    name: "forms-api-local-mock",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || "/", "http://localhost");
        const path = url.pathname;
        const method = (req.method || "GET").toUpperCase();

        if (path === "/api/forms/submit" && method === "POST") {
          let payload = {};
          try {
            const raw = await readRequestBody(req);
            payload = raw ? JSON.parse(raw) : {};
          } catch (_error) {
            writeJson(res, 400, { error: "Invalid JSON body." });
            return;
          }
          const formName =
            typeof payload?.formName === "string"
              ? payload.formName.trim()
              : "";
          if (!formName) {
            writeJson(res, 400, { error: "Missing required formName." });
            return;
          }
          const submissionId = `local_${Date.now().toString(36)}`;
          writeJson(res, 200, { submissionId });
          return;
        }

        if (path === "/api/forms/draft" && method === "GET") {
          const draftId = (url.searchParams.get("draftId") || "").trim();
          if (!draftId || !localDraftStore.has(draftId)) {
            writeJson(res, 200, {});
            return;
          }
          writeJson(res, 200, localDraftStore.get(draftId));
          return;
        }

        if (path === "/api/forms/draft" && method === "POST") {
          let payload = {};
          try {
            const raw = await readRequestBody(req);
            payload = raw ? JSON.parse(raw) : {};
          } catch (_error) {
            writeJson(res, 400, { error: "Invalid JSON body." });
            return;
          }
          const draftId =
            typeof payload?.draftId === "string" && payload.draftId.trim()
              ? payload.draftId.trim()
              : `draft_${Date.now().toString(36)}`;
          const record = {
            draftId,
            data:
              payload?.data && typeof payload.data === "object"
                ? payload.data
                : {},
            updatedAt: new Date().toISOString(),
          };
          localDraftStore.set(draftId, record);
          writeJson(res, 200, { draftId, updatedAt: record.updatedAt });
          return;
        }

        next();
      });
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: "https://www.policeconduct.org",
  build: {
    inlineStylesheets: "always",
  },
  vite: {
    plugins: useFormsApiProxy ? [] : [formsApiMockPlugin()],
    server: useFormsApiProxy
      ? {
          proxy: {
            "/api": {
              target: formsApiProxyTarget,
              changeOrigin: true,
              secure: true,
            },
          },
        }
      : undefined,
  },
  integrations: [
    sitemap({
      entryLimit: 45000,
    }),
  ],
});
