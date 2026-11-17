import path from "node:path";
import { withDb } from "./db.js";
import { copyPersonnelPhoto } from "./personnel-photo-files.js";

/** @type {Promise<Map<string, string>> | undefined} */
let photos;
export async function stagePersonnelPhotos() {
  photos ??= (async () => {
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
