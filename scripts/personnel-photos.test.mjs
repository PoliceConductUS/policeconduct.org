import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { copyPersonnelPhoto } from "../src/lib/personnel-photos.js";
test("copies the explicitly associated image and rejects missing or corrupt bytes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "website-photos-"));
  try {
    const workspace = path.join(root, "workspace");
    const publicDir = path.join(root, "public");
    await mkdir(workspace);
    const bytes = Buffer.from("photo bytes");
    await writeFile(path.join(workspace, "arbitrary-name.webp"), bytes);
    const photo = {
      id: "photo-id",
      personnel_id: "personnel-id",
      workspace_path: "arbitrary-name.webp",
      sha256: createHash("sha256").update(bytes).digest("hex"),
      byte_size: bytes.length,
      content_type: "image/webp",
    };
    assert.equal(
      await copyPersonnelPhoto(photo, workspace, publicDir),
      "/img/personnel-photos/photo-id.webp",
    );
    assert.deepEqual(
      await readFile(
        path.join(publicDir, "img/personnel-photos/photo-id.webp"),
      ),
      bytes,
    );
    await writeFile(path.join(workspace, "arbitrary-name.webp"), "corrupt");
    await assert.rejects(
      copyPersonnelPhoto(photo, workspace, publicDir),
      /hash or size/,
    );
    await assert.rejects(
      copyPersonnelPhoto(
        { ...photo, workspace_path: "missing.webp" },
        workspace,
        publicDir,
      ),
      /ENOENT/,
    );
    await assert.rejects(
      copyPersonnelPhoto(
        { ...photo, workspace_path: "../outside.webp" },
        workspace,
        publicDir,
      ),
      /outside/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
