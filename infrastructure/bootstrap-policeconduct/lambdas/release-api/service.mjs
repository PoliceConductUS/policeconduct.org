export function createHandler({
  privateBucket,
  readCurrent,
  verifyOverride,
  releasePage,
  invalidate,
}) {
  return async (event) => {
    const current = await readCurrent();
    if (event.operation === "release-snapshot") {
      return {
        releaseId: current,
        roster: {
          bucket: privateBucket,
          key: "builds/" + current + "/data/dynamic.json",
        },
      };
    }
    if (event.operation !== "publish-page")
      throw new Error("Unknown release operation");
    if (current !== event.releaseId)
      throw new Error("Page belongs to a different current production release");
    const path = event.path;
    if (
      typeof path !== "string" ||
      !/^\/(?:[^/]+\/)*$/.test(path) ||
      /[\\*%?#\s]|(?:^|\/)\.{1,2}\//.test(path)
    ) {
      throw new Error("Expected a canonical page path");
    }
    const file = path + "index.html";
    const prefix = "/builds/" + current;
    const override = prefix + "/override" + file;
    await verifyOverride(override.slice(1));
    await releasePage("o:" + current + ":" + file);
    const paths = [path, file, override, prefix + "/static" + file];
    if (path !== "/") paths.push(path.slice(0, -1));
    return { invalidationId: await invalidate(paths) };
  };
}
