import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/** @typedef {{id: string, personnel_id: string, workspace_path: string, sha256: string, byte_size: number, content_type: string}} PersonnelPhoto */
const extensions = new Map([
  ["image/webp", "webp"],
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/avif", "avif"],
]);

/** @param {PersonnelPhoto} photo @param {string} workspace @param {string} publicDir */
export async function copyPersonnelPhoto(photo, workspace, publicDir) {
  const root = path.resolve(workspace);
  const filename = path.resolve(root, photo.workspace_path);
  const relative = path.relative(root, filename);
  if (
    path.isAbsolute(photo.workspace_path) ||
    relative.startsWith("..") ||
    relative === ""
  ) {
    throw new Error(
      `Personnel photo ${photo.id} is outside the intake workspace.`,
    );
  }
  const extension = extensions.get(photo.content_type);
  if (!extension || !/^[a-z0-9-]+$/.test(photo.id))
    throw new Error(`Invalid personnel photo ${photo.id}.`);
  const bytes = await readFile(filename);
  if (
    bytes.length !== photo.byte_size ||
    createHash("sha256").update(bytes).digest("hex") !== photo.sha256
  ) {
    throw new Error(
      `Personnel photo ${photo.id} hash or size does not match the imported record.`,
    );
  }
  const url = `/img/personnel-photos/${photo.id}.${extension}`;
  const destination = path.join(publicDir, url.slice(1));
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
  return url;
}

/** @type {Promise<Map<string, string>> | undefined} */
let photos;
export async function stagePersonnelPhotos() {
  photos ??= (async () => {
    const { withDb } = await import("./db.js");
    const rows = await withDb(
      async (client) =>
        (
          await client.query(
            "select id, personnel_id, workspace_path, sha256, byte_size, content_type from public.personnel_photo",
          )
        ).rows,
    );
    const result = new Map();
    for (const photo of rows) {
      const workspace = process.env.INTAKE_WORKSPACE;
      if (!workspace?.trim())
        throw new Error(
          "INTAKE_WORKSPACE is required for imported personnel photos.",
        );
      result.set(
        photo.personnel_id,
        await copyPersonnelPhoto(
          photo,
          workspace,
          path.join(process.cwd(), "public"),
        ),
      );
    }
    return result;
  })();
  return photos;
}

/** @param {string} personnelId */
export async function getPersonnelPhotoById(personnelId) {
  return (await stagePersonnelPhotos()).get(personnelId) ?? null;
}
