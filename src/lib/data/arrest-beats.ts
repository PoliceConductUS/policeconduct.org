export type BeatBoundary = {
  code: string;
  name: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
};
export type BeatMap = {
  beats: (BeatBoundary & { count: number; anchor: [number, number] })[];
  total: number;
  unmapped: number;
};

export function buildBeatMap(
  boundaries: unknown,
  counts: Record<string, number>,
  total: number,
): BeatMap {
  if (!Array.isArray(boundaries))
    throw new Error(
      "Missing arrest beat boundaries; reacquire and transform the agency source",
    );
  const codes = new Set<string>();
  const beats = boundaries.map((beat: BeatBoundary) => {
    if (
      !beat ||
      typeof beat.code !== "string" ||
      !beat.code ||
      typeof beat.name !== "string" ||
      !beat.name ||
      !beat.geometry ||
      !["Polygon", "MultiPolygon"].includes(beat.geometry.type) ||
      !Array.isArray(beat.geometry.coordinates) ||
      !beat.geometry.coordinates.length
    )
      throw new Error("Invalid arrest beat boundary");
    if (codes.has(beat.code))
      throw new Error(`Duplicate arrest beat boundary ${beat.code}`);
    codes.add(beat.code);
    return {
      ...beat,
      anchor: interiorPoint(beat.geometry),
      count: counts[beat.code] ?? 0,
    };
  });
  let sum = 0;
  for (const [code, count] of Object.entries(counts)) {
    if (!Number.isSafeInteger(count) || count < 0)
      throw new Error(`Invalid arrest beat count ${code}`);
    if (code !== "unknown" && !codes.has(code))
      throw new Error(`Missing boundary for arrest beat ${code}`);
    sum += count;
  }
  if (sum !== total)
    throw new Error("Arrest beat counts do not match profile total");
  return { beats, total, unmapped: counts.unknown ?? 0 };
}

// A horizontal scan between vertex latitudes yields interior spans. Pairing all
// ring intersections excludes holes; choose the widest span across components.
function interiorPoint(geometry: BeatBoundary["geometry"]): [number, number] {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  let best: [number, number] | undefined;
  let widest = 0;
  for (const rings of polygons) {
    const ys = [
      ...new Set(rings.flatMap((ring) => ring.map((point) => point[1]))),
    ].sort((a, b) => a - b);
    for (let yIndex = 1; yIndex < ys.length; yIndex++) {
      const y = (ys[yIndex - 1] + ys[yIndex]) / 2;
      const crossings: number[] = [];
      for (const ring of rings) {
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const a = ring[j],
            b = ring[i];
          if (a[1] > y !== b[1] > y)
            crossings.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
        }
      }
      crossings.sort((a, b) => a - b);
      for (let i = 0; i + 1 < crossings.length; i += 2) {
        const width = crossings[i + 1] - crossings[i];
        if (width > widest) {
          widest = width;
          best = [y, (crossings[i] + crossings[i + 1]) / 2];
        }
      }
    }
  }
  if (!best)
    throw new Error("Arrest beat boundary has no interior label point");
  return best;
}
