import fs from "node:fs";
import path from "node:path";

/**
 * Entity images are matched by convention: a file named after the entity id
 * (e.g. `cm7a0bh1z2f39ewvglexrgaig.webp`) placed in that entity type's
 * subfolder is served as the image. Nothing needs to be wired up per image —
 * drop the file in and it appears on the next build.
 *
 * Images are organised into per-type subfolders under the base directory:
 *
 *   <base>/personnel/<officerId>.webp
 *   <base>/report/<reportId>.webp
 *   <base>/state/<stateId>.webp
 *   <base>/city/<cityId>.webp
 *   <base>/county/<countyId>.webp
 *   <base>/place/<placeId>.webp
 *   <base>/agency/<agencyId>.webp
 *
 * Ids are globally unique, so the subfolders are not required for correctness —
 * they keep the assets organised and browsable by type.
 *
 * Images are intentionally NOT committed to git. They are sourced at build time
 * from a configurable base directory so CI can sync them in from an external
 * store (e.g. an assets bucket) before `astro build` copies them into the
 * output.
 *
 * Configuration (both optional):
 *   ENTITY_IMAGES_DIR       Filesystem base dir containing the type subfolders.
 *                           Default: `<project root>/public/img`.
 *   ENTITY_IMAGES_URL_BASE  URL prefix the files are served under.
 *                           Defaults to the base dir's path relative to
 *                           `public/`, or `/img` otherwise.
 */

const SUPPORTED_EXTENSIONS = new Set([
  ".webp",
  ".avif",
  ".png",
  ".jpg",
  ".jpeg",
]);

// `default.*` is a per-type fallback image, not an entity image.
const RESERVED_STEMS = new Set(["default"]);

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, "public");

const imagesBaseDir = path.resolve(
  projectRoot,
  process.env.ENTITY_IMAGES_DIR || "public/img",
);

const resolveUrlBase = (): string => {
  const configured = process.env.ENTITY_IMAGES_URL_BASE;
  if (configured) {
    return `/${configured.replace(/^\/+|\/+$/g, "")}`;
  }
  const relativeToPublic = path.relative(publicDir, imagesBaseDir);
  if (relativeToPublic && !relativeToPublic.startsWith("..")) {
    return `/${relativeToPublic.split(path.sep).join("/")}`;
  }
  return "/img";
};

const urlBase = resolveUrlBase();

export type EntityImageType =
  | "personnel"
  | "report"
  | "state"
  | "city"
  | "county"
  | "place"
  | "agency";

// type -> (id -> served url), scanned once per type and cached.
const cacheByType = new Map<string, Record<string, string>>();

const scanType = (type: string): Record<string, string> => {
  const typeDir = path.join(imagesBaseDir, type);
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(typeDir, { withFileTypes: true });
  } catch {
    // Subfolder may be absent in environments without synced images.
    return {};
  }

  const map: Record<string, string> = {};
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) continue;
    const stem = path.basename(entry.name, path.extname(entry.name));
    if (RESERVED_STEMS.has(stem.toLowerCase())) continue;
    // First match wins if an id somehow has multiple extensions.
    if (!(stem in map)) {
      map[stem] = `${urlBase}/${type}/${entry.name}`;
    }
  }
  return map;
};

export const getEntityImageById = (
  type: EntityImageType | (string & {}),
  id: string,
): string | null => {
  let map = cacheByType.get(type);
  if (!map) {
    map = scanType(type);
    cacheByType.set(type, map);
  }
  return map[id] || null;
};

export const getPersonnelImageById = (personnelId: string): string | null =>
  getEntityImageById("personnel", personnelId);
