import { promises as fs } from "node:fs";
import path from "node:path";

const collator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

export const FORM_ROUTES = [
  "/about/contact/",
  "/volunteer/",
  "/report/new/",
  "/personnel/new/",
  "/personnel/suggest-edit/",
  "/law-enforcement-agency/new/",
  "/law-enforcement-agency/suggest-edit/",
  "/civil-litigation/new/",
  "/civil-litigation/suggest-edit/",
  "/legal-notice/data-subject-access-request/",
  "/status/",
];

const OPTIONAL_SAMPLE_SPECS = [
  {
    label: "report pagination",
    pattern: /^\/report\/[^/]+\/page\/\d+\/$/,
  },
  {
    label: "agency pagination",
    pattern: /^\/law-enforcement-agency\/[^/]+\/page\/\d+\/$/,
  },
  {
    label: "personnel pagination",
    pattern: /^\/personnel\/[^/]+\/page\/\d+\/$/,
  },
  {
    label: "civil litigation pagination",
    pattern: /^\/civil-litigation\/[^/]+\/page\/\d+\/$/,
  },
];

const REQUIRED_SAMPLE_SPECS = [
  { label: "home", pattern: /^\/$/ },
  { label: "report index", pattern: /^\/report\/$/ },
  { label: "report category", pattern: /^\/report\/[a-z]{2,8}\/$/ },
  { label: "report detail", pattern: /^\/report\/[^/]+\/[^/]+\/$/ },
  {
    label: "agency index",
    pattern: /^\/law-enforcement-agency\/$/,
  },
  {
    label: "agency category",
    pattern: /^\/law-enforcement-agency\/[a-z-]{2,20}\/$/,
  },
  {
    label: "agency detail",
    pattern: /^\/law-enforcement-agency\/[^/]+\/[^/]+\/$/,
  },
  { label: "personnel index", pattern: /^\/personnel\/$/ },
  {
    label: "personnel category",
    pattern: /^\/personnel\/[a-z]{2,8}\/$/,
  },
  {
    label: "personnel detail",
    pattern:
      /^\/personnel\/(?!new\/|suggest-edit\/)(?=.*-[a-f0-9]{6}\/$)[^/]+\/$/,
  },
  {
    label: "civil litigation index",
    pattern: /^\/civil-litigation\/$/,
  },
  {
    label: "civil litigation category",
    pattern: /^\/civil-litigation\/[a-z]{2,8}\/$/,
  },
  {
    label: "civil litigation detail",
    pattern: /^\/civil-litigation\/[^/]+\/[^/]+\/$/,
  },
];

const sortRoutes = (routes) =>
  [...routes].sort((a, b) => collator.compare(a, b));

const sampleEvenly = (items, limit) => {
  if (items.length <= limit) {
    return items;
  }

  const sampled = [];
  const step = (items.length - 1) / (limit - 1);
  for (let index = 0; index < limit; index += 1) {
    sampled.push(items[Math.round(index * step)]);
  }

  return [...new Set(sampled)];
};

const walkHtmlFiles = async (dir) => {
  const results = [];
  const dirs = [dir];

  while (dirs.length > 0) {
    const currentDir = dirs.pop();
    if (!currentDir) {
      continue;
    }

    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        dirs.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        results.push(fullPath);
      }
    }
  }

  return results;
};

export const normalizeRouteFromDistHtml = (distDir, htmlPath) => {
  const rel = path.relative(distDir, htmlPath).replaceAll(path.sep, "/");
  if (rel === "index.html") {
    return "/";
  }
  if (rel.endsWith("/index.html")) {
    return `/${rel.slice(0, -"/index.html".length)}/`;
  }
  return `/${rel}`;
};

export const collectHtmlRoutes = async (distDir) => {
  const htmlFiles = await walkHtmlFiles(distDir);
  return sortRoutes(
    htmlFiles.map((htmlPath) => normalizeRouteFromDistHtml(distDir, htmlPath)),
  );
};

export const buildAuditRouteSelection = ({ routes, maxRoutes }) => {
  const allRoutes = sortRoutes(routes);
  const routeSet = new Set(allRoutes);
  const formSet = new Set(FORM_ROUTES);
  const nonFormRoutes = allRoutes.filter((route) => !formSet.has(route));

  const selectedRoutes = [];
  const selectedSet = new Set();
  const missingRequiredRoutes = [];

  const addRoute = (route) => {
    if (!route || selectedSet.has(route)) {
      return;
    }
    selectedSet.add(route);
    selectedRoutes.push(route);
  };

  for (const route of FORM_ROUTES) {
    if (!routeSet.has(route)) {
      missingRequiredRoutes.push(`missing form route ${route}`);
      continue;
    }
    addRoute(route);
  }

  for (const spec of REQUIRED_SAMPLE_SPECS) {
    const match = nonFormRoutes.find((route) => spec.pattern.test(route));
    if (!match) {
      missingRequiredRoutes.push(`missing ${spec.label} sample`);
      continue;
    }
    addRoute(match);
  }

  for (const spec of OPTIONAL_SAMPLE_SPECS) {
    const match = nonFormRoutes.find((route) => spec.pattern.test(route));
    addRoute(match);
  }

  const requiredCount = selectedRoutes.length;
  const effectiveMax = Math.max(maxRoutes, requiredCount);
  const remainingRoutes = allRoutes.filter((route) => !selectedSet.has(route));
  const extraSlots = effectiveMax - requiredCount;
  if (extraSlots > 0 && remainingRoutes.length > 0) {
    for (const route of sampleEvenly(remainingRoutes, extraSlots)) {
      addRoute(route);
    }
  }

  return {
    allRoutes,
    effectiveMax,
    missingRequiredRoutes,
    selectedRoutes: sortRoutes(selectedRoutes),
  };
};
