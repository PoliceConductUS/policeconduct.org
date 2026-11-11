import { readFile } from "node:fs/promises";
import path from "node:path";

function localPath(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[?#\\\s*]/.test(value)
  ) {
    throw new Error("Workspace redirect must use a local path.");
  }
  const parsed = new URL(value, "https://redirect.invalid");
  if (parsed.pathname !== value)
    throw new Error(
      "Workspace redirect must use a local path without traversal.",
    );
  return value.endsWith("/") ? value : `${value}/`;
}

export async function mergeWorkspaceRedirects(
  generated,
  { workspace, hasBuiltDestination },
) {
  if (!workspace) return generated;
  let mappings;
  try {
    mappings = JSON.parse(
      await readFile(path.join(workspace, "redirects.json"), "utf8"),
    );
  } catch (error) {
    if (error.code === "ENOENT") return generated;
    throw error;
  }
  if (!mappings || typeof mappings !== "object" || Array.isArray(mappings)) {
    throw new Error(
      "Workspace redirects.json must be an object mapping old paths to new paths.",
    );
  }
  const configured = Object.entries(mappings).map(([from, to]) => ({
    from: localPath(from),
    to: localPath(to),
    status: 301,
    source: "workspace redirects.json",
  }));
  const bySource = new Map();
  for (const entry of [...generated, ...configured]) {
    const existing = bySource.get(entry.from);
    if (
      existing &&
      (existing.to !== entry.to || existing.status !== entry.status)
    ) {
      throw new Error(`Conflicting redirect for ${entry.from}`);
    }
    if (!existing) bySource.set(entry.from, entry);
  }
  for (const entry of configured) {
    const visited = new Set([entry.from]);
    let destination = entry.to;
    while (bySource.has(destination)) {
      if (visited.has(destination))
        throw new Error(`Redirect loop from ${entry.from}`);
      visited.add(destination);
      destination = bySource.get(destination).to;
    }
    if (destination !== entry.to)
      throw new Error(
        `Workspace redirect must target a final page: ${entry.to}`,
      );
    if (!hasBuiltDestination(entry))
      throw new Error(
        `Workspace redirect destination was not built: ${entry.to}`,
      );
  }
  return [...bySource.values()];
}
